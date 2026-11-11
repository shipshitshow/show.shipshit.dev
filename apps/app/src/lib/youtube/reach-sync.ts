import { formatLocalDate } from '@/lib/date';
import {
  mergeReachRows,
  type ReachRow,
  type VideoReachSnapshot,
} from '@/lib/video-reach';
import { readVideoReach, writeVideoReach } from '@/lib/video-reach-store';
import {
  downloadReport,
  ensureReachJob,
  listReports,
  parseReachCsv,
} from './reporting';
import { getAccessToken, getChannelConfigs } from './token';
import type { ChannelConfig } from './types';

const DOWNLOAD_BATCH = 6;

interface ReachChannelResult {
  channel: string;
  error?: string;
  hint?: string;
  /** True when this run created the reporting job. */
  jobCreated?: boolean;
  /** Reports merged this run. */
  reports: number;
  rows: number;
  /**
   * synced: reports merged or nothing new yet.
   * pending: the job exists but YouTube has produced no report for it yet; the
   * first one arrives within 48 hours of the job being created.
   * failed: see `error`.
   */
  status: 'failed' | 'pending' | 'synced';
}

export interface ReachSyncResult {
  channels: ReachChannelResult[];
  fetchedAt: string;
}

interface ChannelOutcome {
  cursor?: string;
  result: ReachChannelResult;
  rows: ReachRow[];
}

async function syncChannel(
  channel: ChannelConfig,
  cursor: string | undefined,
): Promise<ChannelOutcome> {
  const result: ReachChannelResult = {
    channel: channel.label,
    reports: 0,
    rows: 0,
    status: 'synced',
  };
  const rows: ReachRow[] = [];
  let newCursor = cursor;

  try {
    const token = await getAccessToken(channel);
    const { created, job } = await ensureReachJob(token);
    result.jobCreated = created;

    const reports = await listReports(token, job.id, cursor);
    if (reports.length === 0 && !cursor) result.status = 'pending';

    // Oldest first, so a later (backfilled) report overwrites an earlier one.
    // The cursor only moves past reports that were downloaded and parsed.
    for (let i = 0; i < reports.length; i += DOWNLOAD_BATCH) {
      const batch = reports.slice(i, i + DOWNLOAD_BATCH);
      const csvs = await Promise.all(
        batch.map((report) => downloadReport(token, report)),
      );
      csvs.forEach((csv, index) => {
        rows.push(...parseReachCsv(csv));
        newCursor = batch[index].createTime;
        result.reports++;
      });
    }
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && 'hint' in error) {
      result.hint =
        String((error as { hint?: unknown }).hint ?? '') || undefined;
    }
  }

  result.rows = rows.length;
  return { cursor: newCursor, result, rows };
}

/**
 * Pulls every new daily reach report of every configured channel into the
 * stored snapshot. One channel failing leaves the others, and its own cursor,
 * untouched, so the next run retries exactly the reports it missed.
 */
export async function syncVideoReach(
  now: Date = new Date(),
): Promise<ReachSyncResult> {
  const fetchedAt = now.toISOString();
  // Strict: a Redis outage must not turn into "no history" and a blank overwrite.
  const stored = await readVideoReach({ strict: true });
  let snapshot: VideoReachSnapshot = {
    ...stored,
    cursors: { ...stored.cursors },
  };

  const channels = await getChannelConfigs();
  const outcomes = await Promise.all(
    channels.map((channel) =>
      syncChannel(channel, stored.cursors[channel.label]),
    ),
  );

  let changed = false;
  for (const [index, outcome] of outcomes.entries()) {
    const label = channels[index].label;
    if (outcome.rows.length > 0) {
      snapshot = mergeReachRows(snapshot, outcome.rows, formatLocalDate(now));
    }
    if (outcome.cursor && outcome.cursor !== stored.cursors[label]) {
      snapshot.cursors[label] = outcome.cursor;
      changed = true;
    }
    if (outcome.rows.length > 0) changed = true;
  }

  if (changed) await writeVideoReach({ ...snapshot, fetchedAt });
  return { channels: outcomes.map((outcome) => outcome.result), fetchedAt };
}
