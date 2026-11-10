import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'transcripts');
const CLEAN = path.join(DIR, 'clean');
const ENTITY = /&(?:gt|lt|amp|quot|nbsp|#\d+|#x[0-9a-f]+);/i;
const ID_CLEAN =
  /^(\d{4}-\d{2}-\d{2})-(livestream|short|video)-([\w-]{11})\.txt$/;

const index = JSON.parse(
  fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'),
) as {
  videos: Record<
    string,
    { date: string; lang: string; title: string; type: string }
  >;
};

describe('transcript files', () => {
  test('clean text has no HTML entities left in it', () => {
    const bad = fs
      .readdirSync(CLEAN)
      .filter((name) =>
        ENTITY.test(fs.readFileSync(path.join(CLEAN, name), 'utf8')),
      );
    expect(bad).toEqual([]);
  });

  test('each indexed video has one clean file, named by id, date and type', () => {
    const byId = new Map<string, string[]>();
    for (const name of fs.readdirSync(CLEAN)) {
      const match = name.match(ID_CLEAN);
      if (match) byId.set(match[3], [...(byId.get(match[3]) ?? []), name]);
    }
    for (const [id, entry] of Object.entries(index.videos))
      expect(byId.get(id)).toEqual([`${entry.date}-${entry.type}-${id}.txt`]);
  });

  test('each indexed video has a raw caption file in its language', () => {
    for (const [id, entry] of Object.entries(index.videos)) {
      const dir = entry.type === 'short' ? path.join(DIR, 'shorts') : DIR;
      expect(fs.existsSync(path.join(dir, `${id}.${entry.lang}.vtt`))).toBe(
        true,
      );
    }
  });

  test('no video has two raw caption files (a retitle must not duplicate)', () => {
    const seen = new Map<string, string>();
    for (const dir of [DIR, path.join(DIR, 'shorts')])
      for (const name of fs.readdirSync(dir)) {
        const match = name.match(/^([\w-]{11})[.-].*\.vtt$/);
        if (!match) continue;
        expect([match[1], seen.get(match[1])]).toEqual([match[1], undefined]);
        seen.set(match[1], name);
      }
  });
});
