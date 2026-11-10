import type { ErrorResponse } from '@shipshitshow/types';
import type { ReachRow } from '@/lib/video-reach';
import { normalizeYouTubeError } from './error';

const REPORTING_API = 'https://youtubereporting.googleapis.com/v1';

/**
 * Reach report for a channel's videos: one CSV per day with date, channel_id,
 * video_id, video_thumbnail_impressions and video_thumbnail_impressions_ctr.
 * Added to the Reporting API on 2026-01-15
 * (developers.google.com/youtube/analytics/revision_history).
 */
export const REACH_REPORT_TYPE = 'channel_reach_basic_a1';
const REACH_JOB_NAME = 'Ship Sh*t Show thumbnail reach';

/**
 * The CSV holds video_thumbnail_impressions_ctr as a fraction (0.083 is 8.3%);
 * the app shows percent everywhere. Checked against a real report from both
 * channels on the Mac Studio, see the PR description.
 */
const REPORTING_CTR_TO_PERCENT = 100;

export interface ReportingJob {
  createTime?: string;
  id: string;
  name?: string;
  reportTypeId: string;
}

export interface ReportingReport {
  createTime: string;
  downloadUrl: string;
  endTime?: string;
  id: string;
  startTime: string;
}

/** A Reporting API failure, with YouTube's own message and a hint to act on. */
export class YouTubeReportingError extends Error {
  code?: string;
  hint?: string;
  status: number;

  constructor(status: number, normalized: ErrorResponse) {
    super(normalized.error);
    this.name = 'YouTubeReportingError';
    this.code = normalized.code;
    this.hint = normalized.hint;
    this.status = status;
  }
}

async function reportingFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    const normalized = normalizeYouTubeError(res.status, body);
    // The Reporting API is a separate API in the Google Cloud project; when
    // it is not enabled Google answers 403 with an enable link in the message.
    if (res.status === 403 && /has not been used|disabled/i.test(body)) {
      normalized.hint =
        'Enable the YouTube Reporting API in the Google Cloud project that owns YOUTUBE_CLIENT_ID.';
    }
    throw new YouTubeReportingError(res.status, normalized);
  }
  return res;
}

/** The channel's reach job, created on first use. */
export async function ensureReachJob(token: string): Promise<{
  created: boolean;
  job: ReportingJob;
}> {
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await reportingFetch(`${REPORTING_API}/jobs?${params}`, token);
    const page = (await res.json()) as {
      jobs?: ReportingJob[];
      nextPageToken?: string;
    };
    const existing = page.jobs?.find(
      (job) => job.reportTypeId === REACH_REPORT_TYPE,
    );
    if (existing) return { created: false, job: existing };
    pageToken = page.nextPageToken;
  } while (pageToken);

  const res = await reportingFetch(`${REPORTING_API}/jobs`, token, {
    body: JSON.stringify({
      name: REACH_JOB_NAME,
      reportTypeId: REACH_REPORT_TYPE,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  return { created: true, job: (await res.json()) as ReportingJob };
}

/** Reports created after `createdAfter` (RFC 3339), oldest first. */
export async function listReports(
  token: string,
  jobId: string,
  createdAfter?: string,
): Promise<ReportingReport[]> {
  const reports: ReportingReport[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (createdAfter) params.set('createdAfter', createdAfter);
    if (pageToken) params.set('pageToken', pageToken);
    const res = await reportingFetch(
      `${REPORTING_API}/jobs/${encodeURIComponent(jobId)}/reports?${params}`,
      token,
    );
    const page = (await res.json()) as {
      nextPageToken?: string;
      reports?: ReportingReport[];
    };
    reports.push(...(page.reports ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return reports.sort((a, b) => a.createTime.localeCompare(b.createTime));
}

export async function downloadReport(
  token: string,
  report: ReportingReport,
): Promise<string> {
  // Only the Reporting API's own download host may receive the OAuth token.
  const url = new URL(report.downloadUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.googleapis.com')) {
    throw new Error(`Unexpected report download host: ${url.hostname}`);
  }
  const res = await reportingFetch(report.downloadUrl, token);
  return res.text();
}

/** Splits one CSV line; double quotes wrap a field that contains a comma. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** `20260105` to `2026-01-05`; null for anything else. */
function toIsoDay(value: string): string | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Parses a `channel_reach_basic_a1` CSV. Columns are found by header name, so a
 * reordered or extended report keeps working. A day with no data is a header
 * and nothing else, which gives no rows. A missing column throws instead of
 * quietly reading as zero.
 */
export function parseReachCsv(csv: string): ReachRow[] {
  const lines = csv
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((name) => name.trim());
  const column = (name: string) => {
    const index = header.indexOf(name);
    if (index === -1) {
      throw new Error(
        `Reach report has no "${name}" column (found: ${header.join(', ')})`,
      );
    }
    return index;
  };
  const dateAt = column('date');
  const videoAt = column('video_id');
  const impressionsAt = column('video_thumbnail_impressions');
  const ctrAt = column('video_thumbnail_impressions_ctr');

  const rows: ReachRow[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const day = toIsoDay((fields[dateAt] ?? '').trim());
    const videoId = (fields[videoAt] ?? '').trim();
    const impressions = Number(fields[impressionsAt]);
    const ctr = Number(fields[ctrAt]);
    if (!day || !videoId) continue;
    if (!Number.isFinite(impressions) || !Number.isFinite(ctr)) continue;
    rows.push({
      ctr: ctr * REPORTING_CTR_TO_PERCENT,
      day,
      impressions,
      videoId,
    });
  }
  return rows;
}
