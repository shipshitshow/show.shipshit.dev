import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type RedisLike, setRedisClientForTests } from './redis-storage';
import {
  buildCuts,
  type EditWord,
  isEditCuts,
  markWords,
  parseEditSession,
  rangesFromCuts,
  sectionsOf,
  stutterAndLikeIds,
  suggestedCuts,
} from './transcript-edit';
import {
  listEditSummaries,
  readEditCuts,
  readEditSession,
  saveEditCuts,
  saveEditSession,
} from './transcript-edit-store';

/** Words from "text|turn" pieces, one second apart. */
function words(...pieces: string[]): EditWord[] {
  return pieces.map((piece, at) => {
    const [text, turn = '0'] = piece.split('|');
    return {
      flag: '',
      idx: at + 10,
      spk: Number(turn) % 2,
      t0: at,
      t1: at + 0.8,
      text,
      turn: Number(turn),
    };
  });
}
const flagsOf = (list: EditWord[]) => markWords(list).map((word) => word.flag);

describe('marking', () => {
  test('fillers and words cut off mid-way', () => {
    expect(
      flagsOf(words('So,', 'uh,', 'can-', 'can', 'we', 'um', 'go')),
    ).toEqual(['', 'F', 'S', '', '', 'F', '']);
  });

  test('a word said twice, even with a filler between', () => {
    expect(flagsOf(words('I', 'I', 'think'))).toEqual(['D', '', '']);
    expect(flagsOf(words("it's,", 'uh,', "it's", 'an'))).toEqual([
      'D',
      'F',
      '',
      '',
    ]);
    expect(flagsOf(words('Stop.', 'Stop.'))).toEqual(['', '']);
  });

  test('go ahead and a name is a handover', () => {
    expect(flagsOf(words('Go', 'ahead,', 'Vincent.', 'Yeah,', 'so'))).toEqual([
      'H',
      'H',
      'H',
      '',
      '',
    ]);
  });

  test('a whole sentence of one reaction word, not a tag question', () => {
    expect(flagsOf(words('Sure', 'enough.', 'Yeah.|1', 'Mm-hmm.|0'))).toEqual([
      '',
      '',
      'R',
      'R',
    ]);
    expect(flagsOf(words('Is', 'it', 'good,', 'right?'))).toEqual([
      '',
      '',
      '',
      '',
    ]);
    expect(flagsOf(words('Yeah,', 'we', 'did', 'that.'))).toEqual([
      '',
      '',
      '',
      '',
    ]);
  });

  test('leaves like, you know and I mean alone', () => {
    expect(flagsOf(words('like,', 'you', 'know,', 'I', 'mean,'))).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  test('a flag the file brings is kept', () => {
    const list = words('hello', 'there');
    list[0].flag = 'E';
    expect(markWords(list)[0].flag).toBe('E');
    expect(suggestedCuts(markWords(list))).toEqual(new Set([10]));
  });
});

describe('stutters and like', () => {
  test('finds stutters, repeats and filler like, and keeps real uses', () => {
    const list = markWords(
      words(
        'It',
        'looks',
        'like',
        'shit,',
        'like,',
        'I',
        'I',
        'mean',
        'to-',
        'to',
        'go',
      ),
    );
    const found = stutterAndLikeIds(list);
    expect(found.stutters).toEqual([15, 18]);
    expect(found.fillerLike).toEqual([14]);
    expect(found.allLike).toEqual([12, 14]);
  });

  test('"I was like," is a quote, not filler', () => {
    const found = stutterAndLikeIds(
      markWords(words('I', 'was', 'like,', '"Oh', 'no."')),
    );
    expect(found.fillerLike).toEqual([]);
    expect(found.allLike).toEqual([12]);
  });
});

describe('cuts', () => {
  test('merges neighbours into ranges, in source time', () => {
    const list = words('a', 'b', 'c', 'd', 'e');
    const cut = new Set([10, 11, 13]);
    expect(rangesFromCuts(list, cut)).toEqual([
      { a: 0, b: 1.8, text: 'a b' },
      { a: 3, b: 3.8, text: 'd' },
    ]);
  });

  test('two cut words far apart in time stay separate', () => {
    const list = words('a', 'b');
    list[1].t0 = 30;
    list[1].t1 = 31;
    expect(rangesFromCuts(list, new Set([10, 11]))).toHaveLength(2);
  });

  test('build drops unknown ids and totals seconds', () => {
    const cuts = buildCuts(words('a', 'b'), new Set([11, 10, 99]), new Date(0));
    expect(cuts.idx).toEqual([10, 11]);
    expect(cuts.cutWords).toBe(2);
    expect(cuts.cutSeconds).toBe(1.8);
    expect(isEditCuts(cuts)).toBe(true);
    expect(isEditCuts({ ...cuts, idx: [1.5] })).toBe(false);
  });
});

describe('transcript file', () => {
  const good = {
    speakers: ['Vincent', 'Brian'],
    title: 'Brian stream',
    words: [
      [0, 0, 0.4, 'Hello,', 0, '', 0],
      [1, 0.4, 0.8, 'uh,', 0, '', 0],
      [2, 0.8, 1.2, 'world.', 1, '', 1],
    ],
  };

  test('parses tuples and marks the unmarked', () => {
    const session = parseEditSession(good, 'brian');
    expect(session.words.map((word) => word.flag)).toEqual(['', 'F', '']);
  });

  test('says what is wrong', () => {
    expect(() => parseEditSession({ ...good, title: '' }, 'x')).toThrow(
      'title',
    );
    expect(() => parseEditSession({ ...good, words: [] }, 'x')).toThrow(
      'words',
    );
    expect(() =>
      parseEditSession({ ...good, words: [[0, 2, 1, 'a', 0, '', 0]] }, 'x'),
    ).toThrow('t0 <= t1');
    expect(() =>
      parseEditSession({ ...good, words: [[0, 0, 1, 'a', 5, '', 0]] }, 'x'),
    ).toThrow('unknown speaker');
    expect(() =>
      parseEditSession({ ...good, words: [[0, 0, 1, 'a', 0, 'Z', 0]] }, 'x'),
    ).toThrow('category');
    expect(() =>
      parseEditSession(
        {
          ...good,
          words: [
            [0, 0, 1, 'a', 0, '', 0],
            [0, 1, 2, 'b', 0, '', 0],
          ],
        },
        'x',
      ),
    ).toThrow('repeated');
  });

  test('without sections, ten-minute blocks', () => {
    const session = parseEditSession(
      {
        ...good,
        words: [
          [0, 5, 6, 'a', 0, '', 0],
          [1, 700, 701, 'b', 0, '', 0],
        ],
      },
      'x',
    );
    expect(sectionsOf(session).map((section) => section.title)).toEqual([
      '0:00 to 10:00',
      '10:00 to 20:00',
    ]);
  });
});

describe('storage', () => {
  const saved: Record<string, string | undefined> = {};
  const keys = [
    'EDITS_DIR',
    'KV_REST_API_TOKEN',
    'KV_REST_API_URL',
    'VERCEL',
    'VERCEL_ENV',
  ];
  let dir = '';
  const body = {
    sections: [{ from: 0, title: 'Intro', to: 2 }],
    speakers: ['Vincent'],
    title: 'Test',
    words: Array.from({ length: 2500 }, (_unused, at) => [
      at,
      at,
      at + 0.5,
      at === 1 ? 'uh,' : `w${at}`,
      0,
      '',
      0,
    ]),
  };

  beforeEach(async () => {
    for (const key of keys) saved[key] = process.env[key];
    dir = await mkdtemp(path.join(tmpdir(), 'edits-'));
  });
  afterEach(async () => {
    setRedisClientForTests(null);
    for (const key of keys)
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    await rm(dir, { force: true, recursive: true });
  });

  async function roundTrip() {
    expect(await listEditSummaries()).toEqual([]);
    expect(await readEditSession('brian')).toBeNull();
    const summary = await saveEditSession('brian', body);
    expect(summary.words).toBe(2500);
    const session = await readEditSession('brian');
    expect(session?.words).toHaveLength(2500);
    expect(session?.words[1].flag).toBe('F');
    expect(session?.sections).toEqual([{ from: 0, title: 'Intro', to: 2 }]);
    expect((await listEditSummaries()).map((entry) => entry.id)).toEqual([
      'brian',
    ]);

    expect(await readEditCuts('brian')).toBeNull();
    const cuts = buildCuts(session?.words ?? [], new Set([1, 2]));
    await saveEditCuts('brian', cuts);
    expect((await readEditCuts('brian'))?.idx).toEqual([1, 2]);
    // Pushing the transcript again keeps the saved cuts.
    await saveEditSession('brian', body);
    expect((await readEditCuts('brian'))?.idx).toEqual([1, 2]);
    await expect(saveEditCuts('brian', { idx: ['x'] })).rejects.toThrow('cuts');
    await expect(readEditSession('../etc')).rejects.toThrow('valid');
  }

  test('on the filesystem', async () => {
    delete process.env.VERCEL;
    delete process.env.PRODUCER_STORAGE;
    process.env.EDITS_DIR = dir;
    await roundTrip();
  });

  test('in Redis, in chunks', async () => {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'test';
    process.env.KV_REST_API_URL = 'https://kv.test';
    process.env.KV_REST_API_TOKEN = 'token';
    const store = new Map<string, unknown>();
    const hashes = new Map<string, Record<string, unknown>>();
    const writes: number[] = [];
    setRedisClientForTests({
      get: async (key: string) => store.get(key) ?? null,
      hgetall: async (key: string) => hashes.get(key) ?? null,
      hset: async (key: string, fields: Record<string, unknown>) => {
        writes.push(JSON.stringify(fields).length);
        hashes.set(key, { ...hashes.get(key), ...fields });
      },
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
    } as unknown as RedisLike);
    await roundTrip();
    // 2,500 words go in three parts, so no request carries the whole file.
    expect(Math.max(...writes)).toBeLessThan(JSON.stringify(body).length / 2);
  });

  test('read-only refuses writes', async () => {
    process.env.VERCEL = '1';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    await expect(saveEditSession('brian', body)).rejects.toThrow('Redis');
    expect(await readEditSession('brian')).toBeNull();
  });
});
