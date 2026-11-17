import { expect, test } from 'bun:test';
import { findGrowth, REGISTERED_BASELINES } from './baselines-not-grown.ts';

const base = { 'a.tsx': { async_effect_without_abort: 1, use_effect: 2 } };

test('an unchanged baseline passes', () => {
  expect(findGrowth(base, base)).toEqual([]);
});

test('a smaller baseline passes', () => {
  expect(
    findGrowth(base, {
      'a.tsx': { async_effect_without_abort: 0, use_effect: 1 },
    }),
  ).toEqual([]);
});

test('a raised count fails', () => {
  expect(
    findGrowth(base, {
      'a.tsx': { async_effect_without_abort: 1, use_effect: 3 },
    }),
  ).toEqual(['a.tsx: use_effect baseline grew from 2 to 3']);
});

test('a new entry fails', () => {
  expect(
    findGrowth(base, {
      ...base,
      'b.tsx': { async_effect_without_abort: 0, use_effect: 1 },
    }),
  ).toEqual(['b.tsx: new baseline entry with use_effect = 1']);
});

test('the useEffect baseline is registered', () => {
  expect(REGISTERED_BASELINES).toEqual([
    'scripts/ratchets/baselines/use-effect-audit.json',
  ]);
});
