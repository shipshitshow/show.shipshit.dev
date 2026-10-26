export const PRODUCER_USER_IDS_ENV = 'PRODUCER_CLERK_USER_IDS';
export const SIGN_IN_PATH = '/sign-in';
export const PRODUCERS_ONLY_PATH = '/producers-only';
const PRODUCER_ACCESS_API_PATH = '/api/producer/access';

export type ProducerDenialReason = 'signed_out' | 'not_producer';

export type ProducerAccess =
  | { ok: true; userId: string }
  | { ok: false; reason: ProducerDenialReason };

export interface ProducerDenial {
  status: 401 | 403;
  code: 'sign_in_required' | 'producer_required';
  error: string;
}

const EXACT_PUBLIC_PATHS = new Set([
  '/',
  PRODUCERS_ONLY_PATH,
  PRODUCER_ACCESS_API_PATH,
  '/robots.txt',
  '/sitemap.xml',
]);

const PUBLIC_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/login',
  '/talking-points',
  '/api/og',
  '/api/public',
  '/__clerk',
];

/** Comma-separated Clerk user IDs; blanks and non-`user_` entries are dropped. */
export function parseProducerUserIds(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.startsWith('user_'));
}

export function evaluateProducerAccess(
  userId: string | null | undefined,
  raw: string | undefined = process.env[PRODUCER_USER_IDS_ENV],
): ProducerAccess {
  if (!userId) return { ok: false, reason: 'signed_out' };
  if (!parseProducerUserIds(raw).includes(userId)) {
    return { ok: false, reason: 'not_producer' };
  }
  return { ok: true, userId };
}

export function classifyPath(pathname: string): 'public' | 'producer' {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return 'public';
  const isPublicPrefix = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return isPublicPrefix ? 'public' : 'producer';
}

export function producerDenial(reason: ProducerDenialReason): ProducerDenial {
  if (reason === 'signed_out') {
    return {
      code: 'sign_in_required',
      error: 'Sign in to continue.',
      status: 401,
    };
  }
  return {
    code: 'producer_required',
    error: 'Only producers can use this.',
    status: 403,
  };
}
