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
      '/livestreams/example/talking-points',
      '/livestream/example',
      '/live-stream/2026-10-02',
      '/videos/example',
    ])
      expect(getProductionApp(path)?.id).toBe('shows');
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
    ])
      expect(getProductionApp(path)?.id).toBe('library');
    expect(getProductionApp('/labs/thumbnails')?.id).toBe('labs');
    expect(getProductionPageLabel('/library/covers')).toBe('Covers');
  });
  test('keeps show preparation in the rail instead of contextual menus', () => {
    const shows = PRODUCTION_APPS.find((app) => app.id === 'shows');
    expect(shows?.group).toBe('daily');
    expect(shows?.href).toBe('/livestreams');
    for (const app of PRODUCTION_APPS.filter((app) => app.id !== 'shows')) {
      const hrefs: string[] = app.links.map((link) => link.href);
      expect(hrefs).not.toContain('/livestreams');
    }
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
    const shows = getProductionApp('/livestreams/example/resources');
    expect(
      getActiveNavigationHref(
        '/livestreams/example/resources',
        shows?.links ?? [],
      ),
    ).toBe('/livestreams');
    expect(getActiveNavigationHref('/sign-in', shows?.links ?? [])).toBe(
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
