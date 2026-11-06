export type ThumbnailFormat = 'video' | 'live' | 'short';
export type ThumbnailReview =
  | { status: 'pending' }
  | { status: 'approved'; at: string; by: string }
  | { status: 'rejected'; at: string; by: string; reason?: string }
  | {
      status: 'revise';
      at: string;
      by: string;
      feedback: string;
      prompt: string;
    };
export interface ThumbnailVersion {
  id: string;
  assetHash: string;
  createdAt: string;
  prompt: string;
  legacyRevision: string | null;
  review: ThumbnailReview;
  source: ThumbnailSource;
}
export type ThumbnailSource = 'import' | 'upload' | 'youtube-live';
const SOURCES: readonly string[] = ['import', 'upload', 'youtube-live'];
export interface ThumbnailItem {
  id: string;
  title: string;
  format: ThumbnailFormat;
  visibility: string;
  position: number;
  pairIds: string[];
  currentVersionId: string;
  versions: ThumbnailVersion[];
  revision: number;
  updatedAt: string;
}
export interface ThumbnailCatalogue {
  schemaVersion: 1;
  catalogueId: string;
  importedAt: string;
  items: ThumbnailItem[];
}
export interface ThumbnailLabResponse {
  items: ThumbnailItem[];
  writable: boolean;
  uploadsAvailable: boolean;
}
export type ThumbnailDecision =
  | { action: 'approve'; versionId: string; revision: number }
  | { action: 'reopen'; versionId: string; revision: number }
  | { action: 'reject'; versionId: string; revision: number; reason?: string }
  | { action: 'revise'; versionId: string; revision: number; feedback: string };
export class ThumbnailConflict extends Error {}
export const isVideoId = (value: string) => /^[\w-]{11}$/.test(value);
export const isAssetHash = (value: string) => /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown): value is string => typeof value === 'string';
function isReview(value: unknown): value is ThumbnailReview {
  if (!value || typeof value !== 'object' || !('status' in value)) return false;
  if (value.status === 'pending') return true;
  if (
    !('at' in value) ||
    !text(value.at) ||
    !('by' in value) ||
    !text(value.by)
  )
    return false;
  return (
    value.status === 'approved' ||
    (value.status === 'rejected' &&
      (!('reason' in value) ||
        value.reason === undefined ||
        text(value.reason))) ||
    (value.status === 'revise' &&
      'feedback' in value &&
      text(value.feedback) &&
      'prompt' in value &&
      text(value.prompt))
  );
}
export function isThumbnailVersion(value: unknown): value is ThumbnailVersion {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      text(value.id) &&
      isAssetHash(value.id) &&
      'assetHash' in value &&
      text(value.assetHash) &&
      value.assetHash === value.id &&
      'createdAt' in value &&
      text(value.createdAt) &&
      'prompt' in value &&
      text(value.prompt) &&
      'legacyRevision' in value &&
      (value.legacyRevision === null || text(value.legacyRevision)) &&
      'review' in value &&
      isReview(value.review) &&
      'source' in value &&
      text(value.source) &&
      SOURCES.includes(value.source),
  );
}
export function isThumbnailItem(value: unknown): value is ThumbnailItem {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    !text(value.id) ||
    !isVideoId(value.id)
  )
    return false;
  if (
    !('title' in value) ||
    !text(value.title) ||
    !('format' in value) ||
    (value.format !== 'video' &&
      value.format !== 'live' &&
      value.format !== 'short')
  )
    return false;
  if (
    !('visibility' in value) ||
    !text(value.visibility) ||
    !('position' in value) ||
    typeof value.position !== 'number' ||
    !Number.isSafeInteger(value.position) ||
    !('pairIds' in value) ||
    !Array.isArray(value.pairIds) ||
    !value.pairIds.every((id: unknown) => text(id) && isVideoId(id))
  )
    return false;
  if (
    !('versions' in value) ||
    !Array.isArray(value.versions) ||
    !value.versions.every(isThumbnailVersion) ||
    !value.versions.length
  )
    return false;
  return (
    'currentVersionId' in value &&
    text(value.currentVersionId) &&
    value.versions.some(
      (v: ThumbnailVersion) => v.id === value.currentVersionId,
    ) &&
    'revision' in value &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) >= 0 &&
    'updatedAt' in value &&
    text(value.updatedAt) &&
    new Set(value.versions.map((v: ThumbnailVersion) => v.id)).size ===
      value.versions.length
  );
}
export function parseThumbnailCatalogue(value: unknown): ThumbnailCatalogue {
  if (
    !value ||
    typeof value !== 'object' ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('catalogueId' in value) ||
    !text(value.catalogueId) ||
    !('importedAt' in value) ||
    !text(value.importedAt) ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isThumbnailItem)
  )
    throw new Error('Invalid thumbnail catalogue.');
  if (
    new Set(value.items.map((item: ThumbnailItem) => item.id)).size !==
    value.items.length
  )
    throw new Error('Duplicate video IDs in thumbnail catalogue.');
  return {
    catalogueId: value.catalogueId,
    importedAt: value.importedAt,
    items: value.items,
    schemaVersion: 1,
  };
}
export function parseThumbnailDecision(value: unknown): ThumbnailDecision {
  if (
    !value ||
    typeof value !== 'object' ||
    !('versionId' in value) ||
    !text(value.versionId) ||
    !isAssetHash(value.versionId) ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !('action' in value)
  )
    throw new Error('Invalid thumbnail decision.');
  if (value.action === 'approve')
    return {
      action: 'approve',
      revision: value.revision,
      versionId: value.versionId,
    };
  if (value.action === 'reopen')
    return {
      action: 'reopen',
      revision: value.revision,
      versionId: value.versionId,
    };
  if (value.action === 'reject') {
    const reason =
      'reason' in value && text(value.reason) ? value.reason.trim() : '';
    if (reason.length > 4000)
      throw new Error('Keep the rejection reason under 4000 characters.');
    return {
      action: 'reject',
      ...(reason ? { reason } : {}),
      revision: value.revision,
      versionId: value.versionId,
    };
  }
  if (
    value.action === 'revise' &&
    'feedback' in value &&
    text(value.feedback) &&
    value.feedback.trim() &&
    value.feedback.length <= 4000
  )
    return {
      action: 'revise',
      feedback: value.feedback.trim(),
      revision: value.revision,
      versionId: value.versionId,
    };
  throw new Error('Add a revision note of 1–4000 characters.');
}
export interface ThumbnailTitleEdit {
  action: 'title';
  revision: number;
  title: string;
}
export function parseThumbnailChange(
  value: unknown,
): ThumbnailDecision | ThumbnailTitleEdit {
  if (
    !value ||
    typeof value !== 'object' ||
    !('action' in value) ||
    value.action !== 'title'
  )
    return parseThumbnailDecision(value);
  if (
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !('title' in value) ||
    !text(value.title)
  )
    throw new Error('Invalid thumbnail title.');
  const title = value.title.trim();
  if (!title || title.length > 100)
    throw new Error('Add a title of 1–100 characters.');
  return { action: 'title', revision: value.revision, title };
}
// A title belongs to the video, not to a review, so it stays editable after approval.
export function applyThumbnailTitle(
  item: ThumbnailItem,
  edit: ThumbnailTitleEdit,
  at: string,
): ThumbnailItem {
  if (item.revision !== edit.revision)
    throw new ThumbnailConflict(
      'This thumbnail changed. Refresh before renaming.',
    );
  return {
    ...item,
    revision: item.revision + 1,
    title: edit.title,
    updatedAt: at,
  };
}
export function currentThumbnail(item: ThumbnailItem): ThumbnailVersion {
  const version = item.versions.find(
    (version) => version.id === item.currentVersionId,
  );
  if (!version) throw new Error('Thumbnail version is missing.');
  return version;
}
export function revisionPrompt(
  item: ThumbnailItem,
  feedback: string,
  version: ThumbnailVersion = currentThumbnail(item),
): string {
  const isShort = item.format === 'short';
  return [
    (isShort
      ? 'Create one clean 9:16 YouTube Shorts cover for: '
      : 'Create one clean 16:9 YouTube thumbnail for: ') + item.title,
    'Share the channel camera style, lighting and material quality, not the same scene or props. Invent a composition for this topic. Do not copy a chessboard, pedestal or cathedral set from a reference.',
    /discord/i.test(item.title)
      ? 'Discord must use its official purple/blurple face, never white. Keep the official glyph geometry.'
      : '',
    /openai/i.test(item.title) && /anthropic/i.test(item.title)
      ? 'This is a company comparison: use the clean Anthropic company A-plus-slash mark, not the Claude sunburst or Claude Code mascot.'
      : '',
    'One clear idea, one or two large subjects. Strong camera angle and separation. No added text. Use the supplied official product logos or actual mascot references.',
    isShort
      ? ''
      : 'Keep this ' +
        item.format +
        ' composition different from its linked ' +
        (item.format === 'video' ? 'livestream' : 'edited recap') +
        '.',
    (isShort
      ? 'Do not draw the show asterisk. Keep the area around x940/y290 dark and quiet, and the bottom fifth simple; the app adds the '
      : 'Do not draw the show asterisk. Leave the upper-right quiet; the app adds the ') +
      (item.format === 'video' ? 'white' : 'red') +
      ' signature at fixed geometry.',
    'Requested visual change: ' + feedback,
    'Previous prompt: ' + version.prompt,
  ].join('\n\n');
}
export function applyThumbnailDecision(
  item: ThumbnailItem,
  decision: ThumbnailDecision,
  by: string,
  at: string,
): ThumbnailItem {
  const version = item.versions.find((v) => v.id === decision.versionId);
  if (item.revision !== decision.revision || !version)
    throw new ThumbnailConflict(
      'This thumbnail changed. Refresh before reviewing.',
    );
  const status = version.review.status;
  if (decision.action === 'reopen') {
    if (status !== 'approved' && status !== 'rejected')
      throw new ThumbnailConflict(
        'Only an approved or rejected version can be reopened.',
      );
  } else if (status === 'approved' && decision.action !== 'reject')
    throw new ThumbnailConflict('This version is approved and locked.');
  else if (status === 'rejected')
    throw new ThumbnailConflict('This version is rejected. Reopen it first.');
  if (decision.action === 'approve') {
    // One approved thumbnail per video: locking it rejects every other
    // variation, in the same write. Reopen brings any of them back.
    const reason = 'Another version was approved';
    return {
      ...item,
      currentVersionId: version.id,
      revision: item.revision + 1,
      updatedAt: at,
      versions: item.versions.map((v) =>
        v.id === version.id
          ? { ...v, review: { at, by, status: 'approved' } }
          : v.review.status === 'rejected'
            ? v
            : { ...v, review: { at, by, reason, status: 'rejected' } },
      ),
    };
  }
  const review: ThumbnailReview =
    decision.action === 'reopen'
      ? { status: 'pending' }
      : decision.action === 'reject'
        ? {
            at,
            by,
            ...(decision.reason ? { reason: decision.reason } : {}),
            status: 'rejected',
          }
        : {
            at,
            by,
            feedback: decision.feedback,
            prompt: revisionPrompt(item, decision.feedback, version),
            status: 'revise',
          };
  return {
    ...item,
    revision: item.revision + 1,
    updatedAt: at,
    versions: item.versions.map((v) =>
      v.id === version.id ? { ...v, review } : v,
    ),
  };
}
export function appendThumbnailVersion(
  item: ThumbnailItem,
  version: ThumbnailVersion,
  expectedRevision: number,
): ThumbnailItem {
  if (item.revision !== expectedRevision)
    throw new ThumbnailConflict(
      'This video changed. Refresh before adding a version.',
    );
  if (item.versions.some((v) => v.id === version.id)) return item;
  if (version.review.status !== 'pending')
    throw new Error('New artwork must start in review.');
  return {
    ...item,
    currentVersionId: version.id,
    revision: item.revision + 1,
    updatedAt: version.createdAt,
    versions: [...item.versions, version],
  };
}
export type ThumbnailScope = 'pending' | 'all';
export const THUMBNAIL_PAGE_SIZE = 24;
export function awaitingVersions(item: ThumbnailItem): ThumbnailVersion[] {
  return item.versions.filter((v) => v.review.status === 'pending');
}
/** One entry per video with at least one pending version. */
export function awaitingItems(
  items: readonly ThumbnailItem[],
): ThumbnailItem[] {
  return items.filter((item) => awaitingVersions(item).length > 0);
}
export function visibleThumbnail(
  item: ThumbnailItem,
  scope: ThumbnailScope,
): boolean {
  return scope === 'all' || awaitingVersions(item).length > 0;
}
export interface ThumbnailPage<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}
/** 1-based page, clamped into range so a shrinking list never shows an empty page. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number = THUMBNAIL_PAGE_SIZE,
): ThumbnailPage<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize)),
    current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
    total: items.length,
  };
}
export function thumbnailAssetUrl(
  item: ThumbnailItem,
  version: ThumbnailVersion,
): string {
  return '/api/labs/thumbnails/' + item.id + '/assets/' + version.assetHash;
}
export function thumbnailCdnUrl(
  item: ThumbnailItem,
  version: ThumbnailVersion,
): string {
  return (
    'https://cdn.shipshit.dev/shipshitshow/thumbnails/' +
    item.id +
    '/' +
    version.assetHash +
    '.jpg'
  );
}

/**
 * Newest video first by YouTube publish date. Items without a known date
 * (not uploaded yet, or YouTube unreachable) follow, in catalogue order.
 */
export function sortByPublishDate<
  T extends Pick<ThumbnailItem, 'id' | 'position'>,
>(items: readonly T[], dates: ReadonlyMap<string, string>): T[] {
  return [...items].sort((a, b) => {
    const left = dates.get(a.id),
      right = dates.get(b.id);
    if (left && right && left !== right) return left < right ? 1 : -1;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return a.position - b.position;
  });
}
