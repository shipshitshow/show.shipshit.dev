'use client';

import { Button } from '@shipshitshow/ui';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { parseJsonResponse } from '@/lib/parse-json-response';
import type { SocialOAuthPublicConfig } from '@/lib/social/oauth';
import type { SocialTokenPlatform } from '@/lib/social/tokens';

interface ConfigResponse {
  platforms: SocialOAuthPublicConfig[];
}

interface StatusResponse {
  statuses: Array<{ connected: boolean; platform: SocialTokenPlatform }>;
}

const PLATFORM_LABEL: Record<SocialTokenPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

export function SocialAuthPageClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorPlatform = searchParams.get('platform');
  const [configs, setConfigs] = useState<SocialOAuthPublicConfig[]>([]);
  const [statuses, setStatuses] = useState<StatusResponse['statuses']>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/social/config', { cache: 'no-store' }).then((res) =>
        parseJsonResponse<ConfigResponse>(res),
      ),
      fetch('/api/auth/social/status', { cache: 'no-store' }).then((res) =>
        parseJsonResponse<StatusResponse>(res),
      ),
    ]).then(([configData, statusData]) => {
      setConfigs(configData.platforms);
      setStatuses(statusData.statuses);
    });
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-surface-border bg-surface-card p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-muted">
          Social OAuth
        </p>
        <h1 className="mt-3 text-2xl font-bold text-text-primary">
          Connect short-form platforms
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Connect the Instagram and TikTok creator accounts to feed the
          Short-Form Performance panel on Analytics.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-accent-red/20 bg-accent-red/5 px-4 py-3 text-sm text-text-primary">
            {errorPlatform ? `${errorPlatform}: ` : ''}
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {configs.map((config) => {
            const status = statuses.find(
              (item) => item.platform === config.platform,
            );
            return (
              <div
                key={config.platform}
                className="rounded-xl border border-surface-border bg-surface-elevated/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">
                      {PLATFORM_LABEL[config.platform]}
                    </h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {status?.connected ? 'Token stored' : 'Not connected'} ·{' '}
                      {config.configured
                        ? 'OAuth client configured'
                        : `Missing ${config.clientEnvKey}/${config.secretEnvKey}`}
                    </p>
                  </div>
                  <Button
                    asChild
                    disabled={!config.configured}
                    variant={status?.connected ? 'default' : 'accent'}
                  >
                    <a href={`/api/auth/social/${config.platform}/start`}>
                      {status?.connected ? 'Reconnect' : 'Connect'}
                    </a>
                  </Button>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <p className="font-medium uppercase tracking-widest text-text-muted">
                      Redirect URI
                    </p>
                    <code className="mt-1 block break-all rounded bg-black/20 px-2 py-1 text-text-secondary">
                      {config.redirectUri}
                    </code>
                  </div>
                  <div>
                    <p className="font-medium uppercase tracking-widest text-text-muted">
                      Scopes
                    </p>
                    <p className="mt-1 text-text-secondary">
                      {config.scopes.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
