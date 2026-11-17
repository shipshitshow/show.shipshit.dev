import { describe, expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { TitleLab } from './TitleLab';

function render(seed?: (client: QueryClient) => void) {
  const client = new QueryClient();
  seed?.(client);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <TitleLab />
    </QueryClientProvider>,
  );
}

describe('TitleLab', () => {
  test('shows the loading state until the titles query has data', () => {
    expect(render()).toContain('Loading');
  });

  test('says when there is no snapshot yet', () => {
    const markup = render((client) =>
      client.setQueryData(['title-lab'], {
        drafts: {},
        snapshot: null,
        writable: false,
      }),
    );
    expect(markup).toContain('No snapshot yet');
    expect(markup).toContain('bun run youtube:sync');
  });
});
