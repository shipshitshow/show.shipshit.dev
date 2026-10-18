/**
 * The OAuth surface is available wherever client credentials exist — including
 * production. It used to be gated on `!process.env.VERCEL`, which 404'd the
 * reauth flow in prod and left a revoked/expired token unrecoverable from the
 * dashboard (DashboardClient redirects here on reauth_required).
 */
export function isYouTubeAuthEnabled(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET,
  );
}
