import { describe, expect, test } from 'bun:test';
import {
  classifyPath,
  evaluateProducerAccess,
  parseProducerUserIds,
  producerDenial,
} from '../producer-access';

describe('parseProducerUserIds', () => {
  test('trims entries and drops empties and non-user_ values', () => {
    expect(
      parseProducerUserIds(' user_a , ,user_b,org_c,someone@example.com,'),
    ).toEqual(['user_a', 'user_b']);
  });

  test('unset or empty means nobody', () => {
    expect(parseProducerUserIds(undefined)).toEqual([]);
    expect(parseProducerUserIds('')).toEqual([]);
    expect(parseProducerUserIds(' , ')).toEqual([]);
  });
});

describe('evaluateProducerAccess', () => {
  test('signed out when there is no user id', () => {
    expect(evaluateProducerAccess(null, 'user_a')).toEqual({
      ok: false,
      reason: 'signed_out',
    });
    expect(evaluateProducerAccess(undefined, 'user_a')).toEqual({
      ok: false,
      reason: 'signed_out',
    });
  });

  test('a signed-in user outside the allowlist is not a producer', () => {
    expect(evaluateProducerAccess('user_x', 'user_a,user_b')).toEqual({
      ok: false,
      reason: 'not_producer',
    });
  });

  test('denies by default when the allowlist is empty or unset', () => {
    expect(evaluateProducerAccess('user_a', '')).toEqual({
      ok: false,
      reason: 'not_producer',
    });
    expect(evaluateProducerAccess('user_a', undefined)).toEqual({
      ok: false,
      reason: 'not_producer',
    });
  });

  test('a listed user is a producer', () => {
    expect(evaluateProducerAccess('user_b', 'user_a, user_b')).toEqual({
      ok: true,
      userId: 'user_b',
    });
  });
});

describe('classifyPath', () => {
  test('public paths', () => {
    for (const path of [
      '/',
      '/producers-only',
      '/api/producer/access',
      '/sign-in',
      '/sign-in/factor-one',
      '/sign-up',
      '/login',
      '/robots.txt',
      '/sitemap.xml',
      '/talking-points',
      '/talking-points/some-slug',
      '/api/og',
      '/api/og/episode',
      '/api/public/schedule',
      '/__clerk/v1/client',
    ])
      expect(classifyPath(path)).toBe('public');
  });

  test('everything else is producer, including the OAuth pages and routes', () => {
    for (const path of [
      '/studio',
      '/analytics',
      '/auth/youtube',
      '/auth/social',
      '/api/auth/youtube/start',
      '/api/auth/social/tiktok/callback',
      '/api/admin/seed-tokens',
      '/api/report',
      '/api/comments/reply',
    ])
      expect(classifyPath(path)).toBe('producer');
  });

  test('prefix collisions stay producer', () => {
    for (const path of [
      '/talking-pointsx',
      '/sign-inx',
      '/api/ogx',
      '/api/publicity',
      '/api/producer',
      '/api/producer/access/extra',
      '/producers-only/extra',
    ])
      expect(classifyPath(path)).toBe('producer');
  });
});

describe('producerDenial', () => {
  test('signed out is a 401 sign-in request', () => {
    expect(producerDenial('signed_out')).toMatchObject({
      code: 'sign_in_required',
      status: 401,
    });
  });

  test('a non-producer is a 403', () => {
    expect(producerDenial('not_producer')).toMatchObject({
      code: 'producer_required',
      status: 403,
    });
  });
});
