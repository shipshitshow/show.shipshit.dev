const PUBLIC_CHANNEL_ART =
  'https://yt3.googleusercontent.com/9YC9pcEJY1tQLIroPHwzJk8tNCiObcSK8oH5L7EAfdIQo4i59XZjxN-wCkvBXVaE95YRnU4a5I0=s0';

export async function GET() {
  try {
    const image = await fetch(PUBLIC_CHANNEL_ART, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    const contentType = image.headers.get('content-type')?.split(';')[0];
    if (
      !image.ok ||
      !contentType ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)
    ) {
      return new Response(null, { status: 502 });
    }
    return new Response(image.body, {
      headers: {
        'Cache-Control':
          'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
