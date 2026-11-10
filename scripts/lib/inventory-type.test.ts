import { describe, expect, test } from 'bun:test';
import { classifyUpload } from './inventory-type.ts';

describe('classifyUpload', () => {
  test('a recorded stream published long after it started is a livestream', () => {
    expect(
      classifyUpload({
        actualStartTime: '2026-11-03T14:14:16Z',
        durationSeconds: 3251,
        hasLiveDetails: true,
        publishedAt: '2026-11-04T03:13:40Z',
      }),
    ).toBe('livestream');
  });
  test('a premiere starts when it is published', () => {
    expect(
      classifyUpload({
        actualStartTime: '2026-04-22T12:00:06Z',
        durationSeconds: 465,
        hasLiveDetails: true,
        publishedAt: '2026-04-22T12:00:06Z',
      }),
    ).toBe('premiere');
  });
  test('a live video with no start time is not mistaken for a premiere', () => {
    expect(
      classifyUpload({
        actualStartTime: null,
        durationSeconds: 3000,
        hasLiveDetails: true,
        publishedAt: '2026-04-22T12:00:06Z',
      }),
    ).toBe('livestream');
  });
  test('short uploads are Shorts, long ones are videos', () => {
    const base = {
      actualStartTime: null,
      hasLiveDetails: false,
      publishedAt: '2026-11-06T07:00:22Z',
    };
    expect(classifyUpload({ ...base, durationSeconds: 30 })).toBe('short');
    expect(classifyUpload({ ...base, durationSeconds: 180 })).toBe('short');
    expect(classifyUpload({ ...base, durationSeconds: 640 })).toBe('video');
  });
});
