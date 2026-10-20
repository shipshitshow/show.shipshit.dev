import type { SocialTokenPlatform } from '@/lib/social/tokens';

export interface SocialOAuthPublicConfig {
  clientEnvKey: string;
  configured: boolean;
  docsUrl: string;
  platform: SocialTokenPlatform;
  redirectUri: string;
  scopes: string[];
  secretEnvKey: string;
}

interface SocialOAuthConfig extends SocialOAuthPublicConfig {
  authorizeUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

const PLATFORM_CONFIG: Record<
  SocialTokenPlatform,
  Omit<
    SocialOAuthConfig,
    'clientId' | 'clientSecret' | 'configured' | 'platform' | 'redirectUri'
  > & {
    clientEnvKey: string;
    redirectEnvKey: string;
    secretEnvKey: string;
  }
> = {
  instagram: {
    authorizeUrl:
      process.env.INSTAGRAM_AUTHORIZE_URL ||
      'https://www.instagram.com/oauth/authorize',
    clientEnvKey: 'INSTAGRAM_CLIENT_ID',
    docsUrl:
      'https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/',
    redirectEnvKey: 'INSTAGRAM_OAUTH_REDIRECT_URI',
    scopes: ['instagram_business_basic', 'instagram_business_manage_insights'],
    secretEnvKey: 'INSTAGRAM_CLIENT_SECRET',
    tokenUrl:
      process.env.INSTAGRAM_TOKEN_URL ||
      'https://api.instagram.com/oauth/access_token',
  },
  tiktok: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    clientEnvKey: 'TIKTOK_CLIENT_KEY',
    docsUrl: 'https://developers.tiktok.com/doc/login-kit-web',
    redirectEnvKey: 'TIKTOK_OAUTH_REDIRECT_URI',
    scopes: ['user.info.basic', 'video.list'],
    secretEnvKey: 'TIKTOK_CLIENT_SECRET',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
};

export const SOCIAL_OAUTH_PLATFORMS: SocialTokenPlatform[] = [
  'instagram',
  'tiktok',
];

export function isSocialOAuthPlatform(
  value: string,
): value is SocialTokenPlatform {
  return value === 'instagram' || value === 'tiktok';
}

function getSocialOAuthRedirectUri(
  platform: SocialTokenPlatform,
  origin?: string,
): string {
  const config = PLATFORM_CONFIG[platform];
  const configured = process.env[config.redirectEnvKey]?.trim();
  if (configured) return configured;
  if (!origin) throw new Error(`Missing ${config.redirectEnvKey}`);
  return `${origin}/api/auth/social/${platform}/callback`;
}

export function getSocialOAuthPublicConfigs(
  origin?: string,
): SocialOAuthPublicConfig[] {
  return SOCIAL_OAUTH_PLATFORMS.map((platform) => {
    const config = PLATFORM_CONFIG[platform];
    return {
      clientEnvKey: config.clientEnvKey,
      configured: Boolean(
        process.env[config.clientEnvKey]?.trim() &&
          process.env[config.secretEnvKey]?.trim(),
      ),
      docsUrl: config.docsUrl,
      platform,
      redirectUri: getSocialOAuthRedirectUri(platform, origin),
      scopes: config.scopes,
      secretEnvKey: config.secretEnvKey,
    };
  });
}

export function getSocialOAuthConfig(
  platform: SocialTokenPlatform,
  origin?: string,
): SocialOAuthConfig {
  const config = PLATFORM_CONFIG[platform];
  const clientId = process.env[config.clientEnvKey]?.trim();
  const clientSecret = process.env[config.secretEnvKey]?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(`Missing ${config.clientEnvKey} or ${config.secretEnvKey}`);
  }

  return {
    ...config,
    clientId,
    clientSecret,
    configured: true,
    platform,
    redirectUri: getSocialOAuthRedirectUri(platform, origin),
  };
}
