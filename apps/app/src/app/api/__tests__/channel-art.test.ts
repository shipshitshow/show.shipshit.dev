import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { GET } from '@/app/api/public/channel-art/route';

let restore: (() => void) | undefined;
afterEach(() => restore?.());

function upstream(response: Response) {
  const mock = spyOn(globalThis, 'fetch').mockResolvedValue(response);
  restore = () => mock.mockRestore();
  return mock;
}

describe('public channel artwork', () => {
  test('serves only the fixed public source with image type and cache headers', async () => {
    const fetch = upstream(
      new Response('image bytes', { headers: { 'Content-Type': 'image/png' } }),
    );
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.text()).toBe('image bytes');
    expect(String(fetch.mock.calls[0]?.[0])).toStartWith(
      'https://yt3.googleusercontent.com/',
    );
  });

  test('does not forward an upstream error body', async () => {
    upstream(new Response('upstream diagnostic', { status: 403 }));
    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  test('rejects non-image responses even when the upstream status is successful', async () => {
    upstream(
      new Response('<html>not an image</html>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('');
  });

  test('handles a network failure without exposing error details', async () => {
    const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('upstream diagnostic'),
    );
    restore = () => fetch.mockRestore();
    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('');
  });
});
