import { describe, expect, test } from 'bun:test';
import {
  getActiveNavigationHref,
  getProductionApp,
  getProductionPageLabel,
  isNavigationActive,
  livestreamPath,
  PRODUCTION_APPS,
} from './app-navigation';

describe('production route ownership', () => {
  test('keeps the public library and sign-in outside production apps', () => {
    expect(getProductionApp('/')).toBeUndefined();
    expect(getProductionApp('/sign-in')).toBeUndefined();
  });

  test('has five apps, Content first', () => {
    expect(PRODUCTION_APPS.map((app) => app.id)).toEqual([
      'content',
      'analytics',
      'library',
      'prep',
      'audience',
    ]);
  });

  test('every page sits under its app', () => {
    const owners: Record<string, string> = {
      '/analytics/socials': 'analytics',
      '/audience/leads': 'audience',
      '/content/livestreams/example/talking-points': 'content',
      '/content/shorts': 'content',
      '/library/titles': 'library',
      '/library/transcripts/example': 'library',
      '/prep/backlog': 'prep',
    };
    for (const [path, id] of Object.entries(owners))
      expect(getProductionApp(path)?.id as string).toBe(id);
    expect(isNavigationActive('/analytics-other', '/analytics')).toBe(false);
  });

  test('old routes belong to no app', () => {
    for (const path of [
      '/studio',
      '/videos',
      '/livestreams',
      '/livestreams/example/talking-points',
      '/livestream/example',
      '/live-stream/2026-10-02',
      '/labs/thumbnails',
      '/socials',
      '/comments',
      '/leads',
      '/partnerships',
      '/research',
      '/trends',
      '/topics',
    ])
      expect(getProductionApp(path)).toBeUndefined();
  });

  test('marks only the most specific link active', () => {
    const content = getProductionApp('/content/livestreams/x/resources');
    expect(
      getActiveNavigationHref(
        '/content/livestreams/x/resources',
        content?.links ?? [],
      ),
    ).toBe('/content/livestreams');
    expect(getActiveNavigationHref('/content', content?.links ?? [])).toBe(
      '/content',
    );
    const analytics = getProductionApp('/analytics/episodes');
    expect(
      getActiveNavigationHref('/analytics/episodes', analytics?.links ?? []),
    ).toBe('/analytics/episodes');
    expect(getActiveNavigationHref('/sign-in', content?.links ?? [])).toBe(
      undefined,
    );
  });

  test('labels livestream tabs and links', () => {
    expect(getProductionPageLabel('/content/livestreams/x/resources')).toBe(
      'Resources',
    );
    expect(getProductionPageLabel('/content/livestreams')).toBe('Livestreams');
    expect(getProductionPageLabel('/library/covers')).toBe('Shorts covers');
    expect(livestreamPath('2026-11-03', 'transcript')).toBe(
      '/content/livestreams/2026-11-03/transcript',
    );
  });
});
