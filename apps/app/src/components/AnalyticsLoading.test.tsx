import { expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardClient } from './DashboardClient';
import { EpisodeRollupClient } from './EpisodeRollupClient';

function render(node: React.ReactNode) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      {node}
    </QueryClientProvider>,
  );
}

test('the dashboard renders its loading state before the report query has run', () => {
  const markup = render(<DashboardClient view="overview" />);
  expect(markup).toContain('animate-pulse');
  expect(markup).not.toContain('Last loaded');
});

test('the episode rollup renders its skeleton before the report query has run', () => {
  const markup = render(<EpisodeRollupClient />);
  expect(markup).toContain('animate-');
  expect(markup).not.toContain('cached');
});
