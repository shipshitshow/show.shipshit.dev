/**
 * Thumbnail reach (impressions and click-through rate) per video and day.
 *
 * The YouTube Analytics API cannot report either metric (it answers 400
 * "Unknown identifier (impressions)"). They exist only in the Reporting API's
 * `channel_reach_basic_a1` bulk report, one CSV per day, kept for 30 to 60 days.
 * `/api/cron/video-stats` pulls the new daily reports and merges them into one
 * Redis value, so the dashboard reads reach without calling YouTube and the
 * history outlives YouTube's retention.
 */
export const VIDEO_REACH_KEY = 'video-reach';

/** Days older than this are dropped on every merge, which keeps the value small. */
export const REACH_RETENTION_DAYS = 400;

/** [impressions, click-through rate in percent] for one video on one day. */
type ReachDay = [number, number];

export interface VideoReachSnapshot {
  /** Per channel label: createTime of the newest report already merged. */
  cursors: Record<string, string>;
  /** Video id, then ISO day (YYYY-MM-DD, Pacific time as YouTube reports it). */
  days: Record<string, Record<string, ReachDay>>;
  fetchedAt: string;
}

export interface VideoReach {
  /** Click-through rate in percent (8.3 means 8.3%). */
  ctr: number;
  impressions: number;
}

export function emptyReachSnapshot(): VideoReachSnapshot {
  return { cursors: {}, days: {}, fetchedAt: '' };
}

export function isVideoReachSnapshot(
  value: unknown,
): value is VideoReachSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Partial<VideoReachSnapshot>;
  return (
    typeof snapshot.fetchedAt === 'string' &&
    typeof snapshot.cursors === 'object' &&
    snapshot.cursors !== null &&
    typeof snapshot.days === 'object' &&
    snapshot.days !== null
  );
}

/** One row of a reach report. `ctr` is in percent. */
export interface ReachRow {
  ctr: number;
  day: string;
  impressions: number;
  videoId: string;
}

/**
 * Merges rows from one report into the snapshot. A row replaces an earlier
 * one for the same video and day, because a backfilled report replaces what
 * YouTube sent before. Returns a new snapshot.
 */
export function mergeReachRows(
  snapshot: VideoReachSnapshot,
  rows: ReachRow[],
  today: string,
): VideoReachSnapshot {
  const days: VideoReachSnapshot['days'] = {};
  for (const [videoId, perDay] of Object.entries(snapshot.days)) {
    days[videoId] = { ...perDay };
  }
  for (const row of rows) {
    days[row.videoId] ??= {};
    days[row.videoId][row.day] = [row.impressions, row.ctr];
  }

  const cutoff = shiftDay(today, -REACH_RETENTION_DAYS);
  for (const [videoId, perDay] of Object.entries(days)) {
    for (const day of Object.keys(perDay)) {
      if (day < cutoff) delete perDay[day];
    }
    if (Object.keys(perDay).length === 0) delete days[videoId];
  }
  return { ...snapshot, days };
}

function shiftDay(isoDay: string, delta: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/**
 * Impressions and impression-weighted CTR per video over [startDate, endDate]
 * (inclusive ISO days). A video with no reach rows in the window is absent
 * from the map, which callers show as "not reported", never as 0%.
 */
export function aggregateReach(
  snapshot: VideoReachSnapshot,
  videoIds: string[],
  startDate: string,
  endDate: string,
): Map<string, VideoReach> {
  const result = new Map<string, VideoReach>();
  for (const videoId of new Set(videoIds)) {
    const perDay = snapshot.days[videoId];
    if (!perDay) continue;

    let impressions = 0;
    let clicks = 0;
    let seen = false;
    for (const [day, [dayImpressions, dayCtr]] of Object.entries(perDay)) {
      if (day < startDate || day > endDate) continue;
      seen = true;
      impressions += dayImpressions;
      clicks += (dayImpressions * dayCtr) / 100;
    }
    if (!seen) continue;
    result.set(videoId, {
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      impressions,
    });
  }
  return result;
}
