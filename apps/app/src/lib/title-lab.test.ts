import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildBatch,
  draftProblems,
  summarise,
  type TitleSnapshot,
  titleLength,
  titleStatus,
} from './title-lab';
import { readTitleDrafts, saveTitleDraft } from './title-lab-store';

const snapshot: TitleSnapshot = {
  channelTitle: 'Show',
  fetchedAt: '2026-11-06T11:03:27.554Z',
  videos: [
    {
      id: 'aaaaaaaaaaa',
      privacyStatus: 'public',
      title: 'OpenAI Will Bo Bankrupt Before 2030',
    },
    {
      id: 'bbbbbbbbbbb',
      privacyStatus: 'public',
      title: 'Genfeed.ai: The Open-Source Higgsfield Alternative',
    },
    { id: 'ccccccccccc', privacyStatus: 'unlisted', title: 'x'.repeat(41) },
  ],
};

test('the one-line rule: 40 is fine, 41 to 45 is long, over 45 is out', () => {
  expect(titleStatus('x'.repeat(40))).toBe('ok');
  expect(titleStatus('x'.repeat(41))).toBe('long');
  expect(titleStatus('x'.repeat(45))).toBe('long');
  expect(titleStatus('x'.repeat(46))).toBe('over');
  expect(
    titleStatus('Genfeed.ai: The Open-Source Higgsfield Alternative'),
  ).toBe('over');
});

test('length counts characters, not code units, and ignores outer spaces', () => {
  expect(titleLength('  Hi 🔥 ')).toBe(4);
  expect(summarise(snapshot.videos.map((video) => video.title))).toEqual({
    long: 1,
    ok: 1,
    over: 1,
  });
});

test('drafts are checked against what YouTube refuses', () => {
  expect(draftProblems('Fine title')).toEqual([]);
  expect(draftProblems('  ')).toHaveLength(1);
  expect(draftProblems('x'.repeat(101))).toHaveLength(1);
  expect(draftProblems('a <b>')).toHaveLength(1);
});

test('the batch holds only drafts that change a live title', () => {
  const at = '2026-11-06T12:00:00Z';
  const result = buildBatch(snapshot, {
    aaaaaaaaaaa: {
      text: ' OpenAI Will Be Bankrupt Before 2030 ',
      updatedAt: at,
    },
    bbbbbbbbbbb: {
      text: 'Genfeed.ai: The Open-Source Higgsfield Alternative',
      updatedAt: at,
    },
    ccccccccccc: { text: 'a <b>', updatedAt: at },
    ddddddddddd: { text: 'Gone', updatedAt: at },
  });
  expect(result.batch).toEqual([
    { id: 'aaaaaaaaaaa', title: 'OpenAI Will Be Bankrupt Before 2030' },
  ]);
  expect(result.skipped).toEqual([
    { id: 'bbbbbbbbbbb', reason: 'same as live' },
    { id: 'ccccccccccc', reason: 'A title cannot contain < or >.' },
    { id: 'ddddddddddd', reason: 'not in the snapshot' },
  ]);
});

let directory: string;
const saved = process.env.YOUTUBE_SNAPSHOT_DIR;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'title-lab-'));
  process.env.YOUTUBE_SNAPSHOT_DIR = directory;
  await writeFile(
    path.join(directory, 'main-latest.json'),
    JSON.stringify(snapshot),
  );
});
afterEach(async () => {
  if (saved === undefined) delete process.env.YOUTUBE_SNAPSHOT_DIR;
  else process.env.YOUTUBE_SNAPSHOT_DIR = saved;
  await rm(directory, { force: true, recursive: true });
});

test('a saved draft stays on disk, an empty one removes it, and the snapshot is untouched', async () => {
  const before = await readFile(
    path.join(directory, 'main-latest.json'),
    'utf8',
  );
  expect(await readTitleDrafts()).toEqual({});
  const drafts = await saveTitleDraft(
    'aaaaaaaaaaa',
    ' OpenAI Will Be Bankrupt Before 2030 ',
  );
  expect(drafts.aaaaaaaaaaa.text).toBe('OpenAI Will Be Bankrupt Before 2030');
  expect(Object.keys(await readTitleDrafts())).toEqual(['aaaaaaaaaaa']);
  expect(await saveTitleDraft('aaaaaaaaaaa', '')).toEqual({});
  expect(await readFile(path.join(directory, 'main-latest.json'), 'utf8')).toBe(
    before,
  );
});

test('a draft for an unknown video or with a bad title is refused', async () => {
  await expect(saveTitleDraft('zzzzzzzzzzz', 'Hello')).rejects.toThrow(
    'not in the latest snapshot',
  );
  await expect(saveTitleDraft('aaaaaaaaaaa', 'a <b>')).rejects.toThrow(
    '< or >',
  );
  expect(await readTitleDrafts()).toEqual({});
});
