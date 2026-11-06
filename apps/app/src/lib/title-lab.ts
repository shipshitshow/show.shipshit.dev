/**
 * Titles Lab rules. A title must fit on one line on the YouTube home feed,
 * phone included (skills #13): aim for 40 characters or fewer, never over 45.
 * YouTube's own cap is 100 characters.
 */
export const TITLE_TARGET = 40;
export const TITLE_LIMIT = 45;
export const YOUTUBE_TITLE_CAP = 100;

/** Redis key names under sss:{env}:v1: (see lib/redis-storage.ts). */
export const TITLE_SNAPSHOT_KEY = 'title-lab-snapshot';
export const TITLE_DRAFTS_KEY = 'title-lab-drafts';

export type TitleStatus = 'ok' | 'long' | 'over';
export type TitleDrafts = Record<string, { text: string; updatedAt: string }>;
export type SnapshotVideo = {
  id: string;
  privacyStatus: string;
  publishAt?: string;
  title: string;
};
export type TitleSnapshot = {
  channelTitle: string;
  fetchedAt: string;
  videos: SnapshotVideo[];
};

/** Characters as a reader counts them: an emoji or accented letter is one. */
export function titleLength(title: string) {
  return Array.from(title.trim()).length;
}

export function titleStatus(title: string): TitleStatus {
  const length = titleLength(title);
  if (length > TITLE_LIMIT) return 'over';
  return length > TITLE_TARGET ? 'long' : 'ok';
}

/** What YouTube would refuse, or the house rule would flag, for one draft. */
export function draftProblems(draft: string) {
  const problems: string[] = [];
  if (!draft.trim()) problems.push('The draft is empty.');
  if (draft.length > YOUTUBE_TITLE_CAP)
    problems.push(`YouTube allows ${YOUTUBE_TITLE_CAP} characters.`);
  if (/[<>]/.test(draft)) problems.push('A title cannot contain < or >.');
  return problems;
}

export function isSnapshot(value: unknown): value is TitleSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.channelTitle === 'string' &&
    typeof snapshot.fetchedAt === 'string' &&
    Array.isArray(snapshot.videos) &&
    snapshot.videos.every(
      (video) =>
        video &&
        typeof video === 'object' &&
        typeof video.id === 'string' &&
        typeof video.title === 'string' &&
        typeof video.privacyStatus === 'string',
    )
  );
}

export function isDrafts(value: unknown): value is TitleDrafts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { text?: unknown }).text === 'string' &&
      typeof (entry as { updatedAt?: unknown }).updatedAt === 'string',
  );
}

export function summarise(titles: string[]) {
  const summary = { long: 0, ok: 0, over: 0 };
  for (const title of titles) summary[titleStatus(title)]++;
  return summary;
}

/**
 * The batch file for `bun run youtube:update --batch`: one entry per draft
 * that differs from the live title and passes validation. Drafts for videos
 * that are not in the snapshot, or that match the live title, are left out.
 */
export function buildBatch(snapshot: TitleSnapshot, drafts: TitleDrafts) {
  const batch: Array<{ id: string; title: string }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const live = new Map(snapshot.videos.map((video) => [video.id, video]));
  for (const [id, draft] of Object.entries(drafts)) {
    const video = live.get(id);
    const text = draft.text.trim();
    if (!video) skipped.push({ id, reason: 'not in the snapshot' });
    else if (text === video.title) skipped.push({ id, reason: 'same as live' });
    else if (draftProblems(text).length)
      skipped.push({ id, reason: draftProblems(text)[0] });
    else batch.push({ id, title: text });
  }
  return { batch, skipped };
}

/**
 * What the lab needs from a snapshot, and no more: no descriptions or stats,
 * so the copy kept in Redis stays small.
 */
export function slimSnapshot(snapshot: TitleSnapshot): TitleSnapshot {
  return {
    channelTitle: snapshot.channelTitle,
    fetchedAt: snapshot.fetchedAt,
    videos: snapshot.videos.map((video) => ({
      id: video.id,
      privacyStatus: video.privacyStatus,
      ...(video.publishAt ? { publishAt: video.publishAt } : {}),
      title: video.title,
    })),
  };
}
