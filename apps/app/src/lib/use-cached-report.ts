'use client';

import type { ErrorResponse } from '@shipshitshow/types';
import { isErrorResponse, isReauthRequiredResponse } from '@shipshitshow/types';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  type CachedSnapshot,
  readCachedSnapshot,
  writeCachedSnapshot,
} from '@/lib/client-cache';
import { parseJsonResponse } from '@/lib/parse-json-response';

/** A failed report, carrying the API's optional hint for the error screen. */
class ReportFailure extends Error {
  hint?: string;

  constructor(failure: ErrorResponse) {
    super(failure.error);
    this.hint = failure.hint;
  }
}

interface CachedReportOptions {
  /** localStorage key of the snapshot shown before any request. */
  cacheKey: string;
  /** Message when the request itself throws something that is not an Error. */
  failure: string;
  /** Where Google OAuth sends the producer back to after reconnecting. */
  reauthNext: () => string;
  url: string;
}

/**
 * A report that shows its last localStorage snapshot first and fetches only
 * when there is none, or when refresh() forces it. A response that needs
 * YouTube reauthorization sends the browser to the OAuth screen.
 */
export function useCachedReport<T>(options: CachedReportOptions) {
  const { cacheKey, failure, reauthNext, url } = options;
  const forceNext = useRef(false);
  const query = useQuery<CachedSnapshot<T>>({
    queryFn: async ({ signal }) => {
      const forced = forceNext.current;
      forceNext.current = false;
      if (!forced) {
        const cached = readCachedSnapshot<T>(cacheKey);
        if (cached) return cached;
      }
      try {
        const res = await fetch(url, { signal });
        const data = await parseJsonResponse<T | ErrorResponse>(res);
        if (!res.ok) {
          if (isReauthRequiredResponse(data)) {
            window.location.href = `/auth/youtube?next=${encodeURIComponent(reauthNext())}`;
            // The page is leaving; stay in the loading state until it does.
            return await new Promise<never>(() => {});
          }
          throw new ReportFailure(
            isErrorResponse(data) ? data : { error: `API error ${res.status}` },
          );
        }
        if (isErrorResponse(data)) throw new ReportFailure(data);
        writeCachedSnapshot(cacheKey, data);
        return { data: data as T, savedAt: new Date().toISOString() };
      } catch (e) {
        if (e instanceof ReportFailure) throw e;
        throw new ReportFailure({
          error: e instanceof Error ? e.message : failure,
        });
      }
    },
    queryKey: ['cached-report', cacheKey, url],
    staleTime: Number.POSITIVE_INFINITY,
  });

  const error: ErrorResponse | null = query.error
    ? {
        error: query.error.message,
        ...(query.error instanceof ReportFailure && query.error.hint
          ? { hint: query.error.hint }
          : {}),
      }
    : null;

  return {
    cachedAt: error ? null : (query.data?.savedAt ?? null),
    error,
    loading: query.isFetching,
    refresh: () => {
      forceNext.current = true;
      return query.refetch();
    },
    report: error ? null : (query.data?.data ?? null),
  };
}
