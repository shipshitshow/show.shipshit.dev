import { Button } from '@shipshitshow/ui';
import { useCallback, useEffect, useState } from 'react';

interface AuthStatus {
  connected: boolean;
  status: 'connected' | 'missing_credentials' | 'reauth_required';
  channelLabelsNeedingAuth: string[];
}

const CHANNEL_LABELS = ['main', 'clips'] as const;

export function YouTubeAuthView() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInProgress, setAuthInProgress] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.youtubeAuth.getStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleAuth(label: string) {
    setAuthInProgress(label);
    try {
      const result = await window.electronAPI.youtubeAuth.start(label);
      if (result.success) {
        await fetchStatus();
      }
    } catch {
      // Auth window closed or failed
    } finally {
      setAuthInProgress(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3 animate-pulse">
        <div className="bg-surface-card border border-surface-border rounded-xl h-24" />
        <div className="bg-surface-card border border-surface-border rounded-xl h-24" />
      </div>
    );
  }

  const needsCredentials = status?.status === 'missing_credentials';

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        YouTube Authentication
      </h2>
      <p className="text-xs text-text-muted mb-6">
        Connect your YouTube channels to enable review queue, comments, and
        analytics.
      </p>

      {needsCredentials && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-accent-red font-medium">
            Missing credentials
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and
            YOUTUBE_CHANNEL_ID_MAIN in your .env file.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {CHANNEL_LABELS.map((label) => {
          const isConnected =
            status?.connected ||
            (status?.status === 'reauth_required' &&
              !status.channelLabelsNeedingAuth.includes(label));
          const needsAuth = status?.channelLabelsNeedingAuth.includes(label);
          const isAuthenticating = authInProgress === label;

          return (
            <div
              key={label}
              className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {label} channel
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {isConnected
                    ? 'Connected'
                    : needsAuth
                      ? 'Needs authentication'
                      : 'Not configured'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`size-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-accent-red'
                  }`}
                />
                {!needsCredentials && (
                  <Button
                    onClick={() => handleAuth(label)}
                    disabled={isAuthenticating || needsCredentials}
                    size="sm"
                    className="text-xs bg-accent-red/10 text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
                  >
                    {isAuthenticating
                      ? 'Authenticating...'
                      : isConnected
                        ? 'Re-authenticate'
                        : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Button
          onClick={fetchStatus}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          Refresh status
        </Button>
      </div>
    </div>
  );
}
