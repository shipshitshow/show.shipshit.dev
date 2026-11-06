import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  draftProblems,
  isDrafts,
  isSnapshot,
  type TitleDrafts,
  type TitleSnapshot,
} from './title-lab';

/** Same folder `bun run youtube:sync` writes to. Local only, git-ignored. */
export const snapshotDirectory = () =>
  process.env.YOUTUBE_SNAPSHOT_DIR ||
  path.join(process.cwd(), '../../.youtube-snapshots');
const draftsFile = () => path.join(snapshotDirectory(), 'title-drafts.json');

function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function readTitleSnapshot(): Promise<TitleSnapshot | null> {
  try {
    const data: unknown = JSON.parse(
      await readFile(
        path.join(snapshotDirectory(), 'main-latest.json'),
        'utf8',
      ),
    );
    if (!isSnapshot(data)) throw new Error('The snapshot file is invalid.');
    return data;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

export async function readTitleDrafts(): Promise<TitleDrafts> {
  try {
    const data: unknown = JSON.parse(await readFile(draftsFile(), 'utf8'));
    if (!isDrafts(data)) throw new Error('The drafts file is invalid.');
    return data;
  } catch (error) {
    if (missing(error)) return {};
    throw error;
  }
}

/** Save one draft; an empty text removes it. Never touches YouTube. */
export async function saveTitleDraft(id: string, text: string) {
  const trimmed = text.trim();
  if (trimmed) {
    const problems = draftProblems(trimmed);
    if (problems.length) throw new Error(problems[0]);
  }
  const snapshot = await readTitleSnapshot();
  if (!snapshot?.videos.some((video) => video.id === id))
    throw new Error('That video is not in the latest snapshot.');
  const drafts = await readTitleDrafts();
  if (trimmed)
    drafts[id] = { text: trimmed, updatedAt: new Date().toISOString() };
  else delete drafts[id];
  await mkdir(snapshotDirectory(), { recursive: true });
  const temporary = `${draftsFile()}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(drafts, null, 2)}\n`, {
    flag: 'wx',
  });
  await rename(temporary, draftsFile());
  return drafts;
}
