import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreamArtifactsPanel } from '@/components/artifacts/StreamArtifactsPanel';
import { PublicTalkingPointsTabs } from '@/components/livestreams/PublicTalkingPointsTabs';
import { ARTIFACTS } from '@/lib/artifacts/registry';

describe('public livestream notes', () => {
  test('offer an Artifacts tab next to the existing tabs', () => {
    const markup = renderToStaticMarkup(
      <PublicTalkingPointsTabs
        artifacts={<p>artifact list</p>}
        prompts={<p>prompt list</p>}
        ressources={<p>resource list</p>}
        talkingPoints={<p>rundown</p>}
      />,
    );
    for (const label of ['Talking Points', 'Ressources', 'Prompts']) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('Artifacts');
    expect(markup).toContain('rundown');
  });

  test('the Artifacts panel lists what is attached to the stream', () => {
    const markup = renderToStaticMarkup(
      <StreamArtifactsPanel date="2026-11-03" slug="upcoming" />,
    );
    for (const artifact of ARTIFACTS.filter((item) =>
      item.streams.includes('2026-11-03'),
    )) {
      expect(markup).toContain(`href="/artifacts/${artifact.slug}"`);
      expect(markup).toContain(artifact.title);
    }
    expect(markup).toContain('href="/talking-points/upcoming/artifacts"');
    expect(markup).toContain('href="/artifacts"');
  });

  test('the Artifacts panel says so when nothing is attached', () => {
    const markup = renderToStaticMarkup(
      <StreamArtifactsPanel date="2020-01-07" slug="2020-01-07" />,
    );
    expect(markup).toContain('No artifacts are attached');
    expect(markup).not.toContain('href="/artifacts/');
  });
});
