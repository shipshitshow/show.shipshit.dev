import { describe, expect, test } from 'bun:test';
import type { Topic } from '@shipshitshow/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { KanbanBoard } from './KanbanBoard';

const topic = (slug: string, status: string): Topic =>
  ({
    content: '',
    date: '2026-11-10',
    slug,
    source: 'manual',
    status,
    title: `Topic ${slug}`,
  }) as unknown as Topic;

function render(seed: (client: QueryClient) => void) {
  const client = new QueryClient();
  seed(client);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <KanbanBoard />
    </QueryClientProvider>,
  );
}

describe('KanbanBoard', () => {
  test('shows the loading state before the dates arrive', () => {
    expect(render(() => {})).toContain('Loading topics…');
  });

  test('falls back to the newest date and counts the selected topics', () => {
    const markup = render((client) => {
      client.setQueryData(['kanban', 'dates'], {
        dates: ['2026-11-10', '2026-11-03'],
      });
      client.setQueryData(
        ['kanban', 'topics', '2026-11-10'],
        [topic('a', 'in_progress'), topic('b', 'draft')],
      );
    });
    expect(markup).toContain('2026-11-10 · 1/2 selected');
  });
});
