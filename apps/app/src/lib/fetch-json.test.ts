import { afterEach, expect, test } from 'bun:test';
import { fetchJson } from './fetch-json';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(response: Response) {
  const calls: Array<{ signal?: AbortSignal | null; url: string }> = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ signal: init?.signal, url });
    return response;
  }) as unknown as typeof fetch;
  return calls;
}

test('returns the parsed body and passes the signal through', async () => {
  const calls = stubFetch(Response.json({ leads: [1] }));
  const controller = new AbortController();
  const body = await fetchJson<{ leads: number[] }>(
    '/api/leads',
    'Failed to load leads',
    controller.signal,
  );
  expect(body).toEqual({ leads: [1] });
  expect(calls).toEqual([{ signal: controller.signal, url: '/api/leads' }]);
});

test('throws the given message when the response is not ok', async () => {
  stubFetch(new Response('nope', { status: 500 }));
  await expect(fetchJson('/api/leads', 'Failed to load leads')).rejects.toThrow(
    'Failed to load leads',
  );
});
