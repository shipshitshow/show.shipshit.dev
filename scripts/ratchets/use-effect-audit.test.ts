import { expect, test } from 'bun:test';
import {
  compareCounts,
  isAuditedSource,
  parseBaseline,
  scanSource,
  serializeBaseline,
} from './use-effect-audit.ts';

const scan = (code: string) => scanSource('apps/app/src/x.tsx', code);

test('counts each useEffect call, including React.useEffect', () => {
  const result = scan(`
    useEffect(() => { document.title = 'a'; }, []);
    React.useEffect(() => { document.title = 'b'; }, []);
  `);
  expect(result.counts).toEqual({
    async_effect_without_abort: 0,
    use_effect: 2,
  });
});

test('ignores the word useEffect in strings and comments', () => {
  const result = scan(`
    // useEffect(() => {}, []);
    const note = 'useEffect(() => {}, [])';
  `);
  expect(result.counts.use_effect).toBe(0);
});

test('await, .then and fetch without an abort are async_effect_without_abort', () => {
  const result = scan(`
    useEffect(() => { void (async () => { await load(); })(); }, []);
    useEffect(() => { load().then(setData); }, []);
    useEffect(() => { fetch('/api').then(setData); }, []);
  `);
  expect(result.counts).toEqual({
    async_effect_without_abort: 3,
    use_effect: 3,
  });
});

test('AbortController, AbortSignal or signal anywhere in the callback clears it', () => {
  const result = scan(`
    useEffect(() => {
      const controller = new AbortController();
      fetch('/api', { signal: controller.signal }).then(setData);
      return () => controller.abort();
    }, []);
    useEffect(() => { load(abortSignal as AbortSignal).then(setData); }, []);
    useEffect(() => { load({ signal }).then(setData); }, [signal]);
  `);
  expect(result.counts).toEqual({
    async_effect_without_abort: 0,
    use_effect: 3,
  });
});

test('a cancelled flag is not an abort', () => {
  const result = scan(`
    useEffect(() => {
      let cancelled = false;
      load().then((d) => { if (!cancelled) setData(d); });
      return () => { cancelled = true; };
    }, []);
  `);
  expect(result.counts).toEqual({
    async_effect_without_abort: 1,
    use_effect: 1,
  });
});

test('a synchronous subscription is not async', () => {
  const result = scan(`
    useEffect(() => {
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);
  `);
  expect(result.counts).toEqual({
    async_effect_without_abort: 0,
    use_effect: 1,
  });
});

test('an ignore comment with a reason on the line above skips the call', () => {
  const result = scan(
    [
      '// use-effect-audit: ignore subscribes to the resize observer',
      'useEffect(() => { observe(); }, []);',
    ].join('\n'),
  );
  expect(result.counts).toEqual({
    async_effect_without_abort: 0,
    use_effect: 0,
  });
  expect(result.ignored).toBe(1);
  expect(result.badIgnores).toEqual([]);
});

test('an ignore comment without a reason does not skip the call and is reported', () => {
  const result = scan(
    [
      '// use-effect-audit: ignore',
      'useEffect(() => { observe(); }, []);',
    ].join('\n'),
  );
  expect(result.counts).toEqual({
    async_effect_without_abort: 0,
    use_effect: 1,
  });
  expect(result.ignored).toBe(0);
  expect(result.badIgnores).toEqual([
    { line: 1, reason: 'ignore comment needs a reason' },
  ]);
});

test('an ignore comment two lines above does not apply', () => {
  const result = scan(
    [
      '// use-effect-audit: ignore too far away',
      '',
      'useEffect(() => {}, []);',
    ].join('\n'),
  );
  expect(result.counts.use_effect).toBe(1);
  expect(result.ignored).toBe(0);
});

test('only non-test sources under apps and packages are audited', () => {
  expect(isAuditedSource('apps/app/src/components/A.tsx')).toBe(true);
  expect(isAuditedSource('packages/ui/src/hook.ts')).toBe(true);
  expect(isAuditedSource('apps/app/src/components/A.test.tsx')).toBe(false);
  expect(isAuditedSource('apps/app/src/components/__tests__/A.tsx')).toBe(
    false,
  );
  expect(isAuditedSource('apps/app/src/types.d.ts')).toBe(false);
  expect(isAuditedSource('scripts/ratchets/use-effect-audit.ts')).toBe(false);
  expect(isAuditedSource('editing/scripts/x.ts')).toBe(false);
});

const base = {
  'a.tsx': { async_effect_without_abort: 1, use_effect: 2 },
};

test('equal counts pass', () => {
  expect(compareCounts(base, base)).toEqual([]);
});

test('a higher count fails', () => {
  expect(
    compareCounts(base, {
      'a.tsx': { async_effect_without_abort: 1, use_effect: 3 },
    }),
  ).toEqual(['a.tsx: use_effect grew from 2 to 3']);
});

test('a new file fails', () => {
  expect(
    compareCounts(base, {
      ...base,
      'b.tsx': { async_effect_without_abort: 0, use_effect: 1 },
    }),
  ).toEqual(['b.tsx: new file with use_effect = 1']);
});

test('a lower count fails until the baseline is pruned', () => {
  expect(
    compareCounts(base, {
      'a.tsx': { async_effect_without_abort: 0, use_effect: 2 },
    }),
  ).toEqual([
    'a.tsx: async_effect_without_abort fell from 1 to 0; prune the baseline with: bun run check:effects --write',
  ]);
});

test('a file that no longer has effects fails until it is removed from the baseline', () => {
  expect(compareCounts(base, {})).toEqual([
    'a.tsx: async_effect_without_abort fell from 1 to 0; prune the baseline with: bun run check:effects --write',
    'a.tsx: use_effect fell from 2 to 0; prune the baseline with: bun run check:effects --write',
  ]);
});

test('the baseline serializes with sorted keys and round-trips', () => {
  const text = serializeBaseline({
    'a.tsx': { async_effect_without_abort: 1, use_effect: 2 },
    'b.tsx': { async_effect_without_abort: 0, use_effect: 1 },
  });
  expect(text).toBe(`{
  "files": {
    "a.tsx": {
      "async_effect_without_abort": 1,
      "use_effect": 2
    },
    "b.tsx": {
      "async_effect_without_abort": 0,
      "use_effect": 1
    }
  }
}
`);
  expect(parseBaseline(text)).toEqual({
    'a.tsx': { async_effect_without_abort: 1, use_effect: 2 },
    'b.tsx': { async_effect_without_abort: 0, use_effect: 1 },
  });
});

test('the baseline orders paths case-insensitively, as Biome does', () => {
  const text = serializeBaseline(
    Object.fromEntries([
      [
        'apps/app/src/components/DashboardClient.tsx',
        { async_effect_without_abort: 0, use_effect: 1 },
      ],
      [
        'apps/app/src/components/agent/ContentAgent.tsx',
        { async_effect_without_abort: 0, use_effect: 2 },
      ],
    ]),
  );
  expect(Object.keys(parseBaseline(text))).toEqual([
    'apps/app/src/components/agent/ContentAgent.tsx',
    'apps/app/src/components/DashboardClient.tsx',
  ]);
});
