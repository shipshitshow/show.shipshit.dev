import { describe, expect, test } from 'bun:test';
import {
  getActiveNavigationHref,
  getProductionApp,
  getProductionPageLabel,
  isNavigationActive,
  PRODUCTION_APPS,
} from './app-navigation';

describe('production route ownership', () => {
  test('keeps the public library and sign-in outside production apps', () => {
    expect(getProductionApp('/')).toBeUndefined();
    expect(getProductionApp('/sign-in')).toBeUndefined();
  });
  test('resolves module deep links and existing aliases without prefix collisions', () => {
    for (const path of [
      '/content',
      '/content/shorts',
      '/livestreams/example/talking-points',
    ])
      expect(getProductionApp(path)?.id).toBe('content');
    for (const path of [
      '/studio',
      '/videos',
      '/livestream/example',
      '/live-stream/2026-10-02',
    ])
      expect(getProductionApp(path)).toBeUndefined();
    expect(getProductionApp('/analytics/episodes')?.id).toBe('analytics');
    expect(getProductionApp('/leads')?.id).toBe('partnerships');
    expect(getProductionApp('/topics')?.id).toBe('research');
    expect(getProductionApp('/socials')?.id).toBe('socials');
    expect(isNavigationActive('/analytics-other', '/analytics')).toBe(false);
  });
  test('keeps every library section under one rail entry', () => {
    for (const path of [
      '/library',
      '/library/assets',
      '/library/artifacts',
      '/library/thumbnails',
      '/library/covers',
      '/library/transcripts',
      '/library/transcripts/example',
    ])
      expect(getProductionApp(path)?.id).toBe('library');
    expect(getProductionApp('/labs/thumbnails')?.id).toBe('labs');
    expect(getProductionPageLabel('/library/covers')).toBe('Covers');
  });
  test('opens on Content, with no Home app', () => {
    expect(PRODUCTION_APPS[0].id).toBe('content');
    expect(PRODUCTION_APPS[0].href).toBe('/content');
    expect(PRODUCTION_APPS.map((app) => app.id)).not.toContain('home');
    const hrefs = PRODUCTION_APPS.flatMap((app) =>
      app.links.map((link) => link.href as string),
    );
    for (const gone of ['/studio', '/videos', '/livestreams'])
      expect(hrefs).not.toContain(gone);
  });
  test('marks only the most specific contextual link active', () => {
    const analytics = getProductionApp('/analytics/episodes');
    expect(
      getActiveNavigationHref('/analytics/episodes', analytics?.links ?? []),
    ).toBe('/analytics/episodes');
    expect(getActiveNavigationHref('/analytics', analytics?.links ?? [])).toBe(
      '/analytics',
    );
    const socials = getProductionApp('/comments');
    expect(getActiveNavigationHref('/comments', socials?.links ?? [])).toBe(
      '/comments',
    );
    const content = getProductionApp('/livestreams/example/resources');
    expect(
      getActiveNavigationHref(
        '/livestreams/example/resources',
        content?.links ?? [],
      ),
    ).toBe('/content/livestreams');
    expect(
      getActiveNavigationHref('/content/shorts', content?.links ?? []),
    ).toBe('/content/shorts');
    expect(getActiveNavigationHref('/content', content?.links ?? [])).toBe(
      '/content',
    );
    expect(getActiveNavigationHref('/sign-in', content?.links ?? [])).toBe(
      undefined,
    );
  });
  test('labels episode tabs and episode analytics accurately', () => {
    expect(getProductionPageLabel('/livestreams/example/resources')).toBe(
      'Resources',
    );
    expect(getProductionPageLabel('/analytics/episodes')).toBe(
      'Episode performance',
    );
  });
});
