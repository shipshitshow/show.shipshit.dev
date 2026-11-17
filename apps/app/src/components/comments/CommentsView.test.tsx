import { describe, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommentsView } from './CommentsView';

function render(seed?: (client: QueryClient) => void) {
  // Seeded data counts as fresh, so the server render does not start a fetch.
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  });
  seed?.(client);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <CommentsView />
    </QueryClientProvider>,
  );
}

describe('CommentsView', () => {
  test('shows the loading text before the comments query has data', () => {
    expect(render()).toContain('Loading comments...');
  });

  test('renders an empty inbox from the query data', () => {
    const markup = render((client) =>
      client.setQueryData(['comments'], {
        fetchedAt: '2026-11-17T10:00:00.000Z',
        items: [],
      }),
    );
    expect(markup).toContain('0 comments loaded');
    expect(markup).toContain('No comments found');
  });
});
