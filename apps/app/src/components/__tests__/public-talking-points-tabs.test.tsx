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

  test('the Artifacts panel links every artifact and the library', () => {
    const markup = renderToStaticMarkup(<StreamArtifactsPanel />);
    for (const artifact of ARTIFACTS) {
      expect(markup).toContain(`href="/artifacts/${artifact.slug}"`);
      expect(markup).toContain(artifact.title);
    }
    expect(markup).toContain('href="/artifacts"');
  });
});
