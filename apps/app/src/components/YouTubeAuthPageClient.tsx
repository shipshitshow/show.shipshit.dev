'use client';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { parseJsonResponse } from '@/lib/parse-json-response';
import type { YouTubeAuthStatus } from '@/lib/youtube/types';

interface YouTubeAuthConfigResponse {
  redirectUri: string;
}

export function YouTubeAuthPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get('next') || '/';
  const error = searchParams.get('error');
  const [status, setStatus] = useState<YouTubeAuthStatus | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('main');

  useEffect(() => {
    fetch('/api/auth/youtube/status', { cache: 'no-store' })
      .then((res) => parseJsonResponse<YouTubeAuthStatus>(res))
      .then((data) => {
        setStatus(data);
        if (data.channelLabelsNeedingAuth.length > 0) {
          setSelectedChannel(data.channelLabelsNeedingAuth[0]);
        }
        if (data.connected) {
          router.replace(next);
        }
      })
      .catch(() => {
        setStatus({
          channelLabelsNeedingAuth: ['main'],
          connected: false,
          status: 'reauth_required',
        });
      });
  }, [next, router]);

  useEffect(() => {
    fetch('/api/auth/youtube/config', { cache: 'no-store' })
      .then((res) => parseJsonResponse<YouTubeAuthConfigResponse>(res))
      .then((data) => setRedirectUri(data.redirectUri))
      .catch(() => setRedirectUri(null));
  }, []);

  const channelOptions = useMemo(() => {
    const options = new Set(['main', 'clips']);
    for (const label of status?.channelLabelsNeedingAuth ?? []) {
      options.add(label);
    }
    return Array.from(options);
  }, [status]);

  const channelToReconnect = selectedChannel;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-2xl border border-surface-border bg-surface-card p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-muted">
          YouTube OAuth
        </p>
        <h1 className="mt-3 text-2xl font-bold text-text-primary">
          YouTube access needs to be reconnected
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          The stored refresh token expired or was revoked. Until it is fixed,
          the app blocks navigation and sends you back through Google OAuth.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-accent-red/20 bg-accent-red/5 px-4 py-3 text-sm text-text-primary">
            OAuth returned an error: {error}
          </div>
        ) : null}

        {error === 'redirect_uri_mismatch' ? (
          <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200">
            Google is rejecting the callback URL. Add this exact URI to your
            Google OAuth client&apos;s authorized redirect URIs:
            <code className="mt-2 block rounded bg-black/20 px-2 py-1 text-xs text-yellow-100">
              {redirectUri || 'loading redirect URI…'}
            </code>
          </div>
        ) : null}

        {status?.status === 'missing_credentials' ? (
          <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
            Missing `YOUTUBE_CLIENT_ID` or `YOUTUBE_CLIENT_SECRET`. Add those
            first, then reload this page.
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-surface-border bg-surface-elevated/40 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
            Channel
          </p>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="mt-2 w-full text-sm font-semibold text-text-primary">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 rounded-xl border border-surface-border bg-surface-elevated/40 p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
            Redirect URI
          </p>
          <p className="mt-2 break-all text-sm text-text-primary">
            {redirectUri || 'Loading…'}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setStarting(true);
              window.location.href = `/api/auth/youtube/start?channel=${encodeURIComponent(channelToReconnect)}&next=${encodeURIComponent(next)}`;
            }}
            variant="accent"
            size="lg"
          >
            {starting ? 'Opening Google OAuth…' : 'Reconnect YouTube'}
          </Button>
          <span className="text-xs text-text-muted">
            You&apos;ll come back here automatically after consent.
          </span>
        </div>
      </div>
    </main>
  );
}
