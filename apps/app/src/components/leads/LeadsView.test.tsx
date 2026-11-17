import { describe, expect, test } from 'bun:test';
import type { Lead, LeadListResponse } from '@shipshitshow/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeadsView } from './LeadsView';

function render(seed?: LeadListResponse) {
  const client = new QueryClient();
  if (seed) client.setQueryData(['leads'], seed);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LeadsView />
    </QueryClientProvider>,
  );
}

const lead = (id: string): Lead =>
  ({
    createdAt: '2026-11-17T10:00:00.000Z',
    episodeDate: '2026-11-10',
    id,
    name: `Lead ${id}`,
    status: 'new',
  }) as unknown as Lead;

describe('LeadsView', () => {
  test('shows the loading state until the leads query has data', () => {
    expect(render()).toContain('Loading leads…');
  });

  test('renders the count and per-episode totals from the query data', () => {
    const markup = render({
      episodes: [{ date: '2026-11-10' }],
      leads: [lead('a'), lead('b')],
      leadsByEpisode: { '2026-11-10': 2 },
    } as unknown as LeadListResponse);
    expect(markup).toContain('2 leads logged');
    expect(markup).toContain('2026-11-10');
    expect(markup).not.toContain('Loading leads…');
  });
});
