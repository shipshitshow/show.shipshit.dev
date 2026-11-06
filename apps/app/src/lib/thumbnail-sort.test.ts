import { expect, test } from 'bun:test';
import { sortByPublishDate } from './thumbnail-lab';

const item = (id: string, position: number) => ({ id, position });

test('the lab lists the newest video first by publish date', () => {
  const items = [item('old', 0), item('new', 1), item('mid', 2)];
  const dates = new Map([
    ['old', '2026-09-01T10:00:00Z'],
    ['mid', '2026-10-01T10:00:00Z'],
    ['new', '2026-11-05T18:30:00Z'],
  ]);
  expect(sortByPublishDate(items, dates).map((row) => row.id)).toEqual([
    'new',
    'mid',
    'old',
  ]);
});

test('videos without a known date follow, in catalogue order', () => {
  const items = [item('b', 2), item('dated', 5), item('a', 1)];
  const dates = new Map([['dated', '2026-11-01T00:00:00Z']]);
  expect(sortByPublishDate(items, dates).map((row) => row.id)).toEqual([
    'dated',
    'a',
    'b',
  ]);
  expect(sortByPublishDate(items, new Map()).map((row) => row.id)).toEqual([
    'a',
    'b',
    'dated',
  ]);
});
