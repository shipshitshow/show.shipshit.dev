import type { Metadata } from 'next';

const LOCAL_SITE_URL = 'http://localhost:3001';
const PRODUCTION_SITE_URL = 'https://show.shipshit.dev';

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_URL;
  }

  return LOCAL_SITE_URL;
}

export function toAbsoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

export function buildDefaultMetadata(): Pick<
  Metadata,
  'metadataBase' | 'openGraph' | 'twitter'
> {
  const metadataBase = new URL(getSiteUrl());
  const defaultCardUrl = toAbsoluteUrl('/api/og');

  return {
    metadataBase,
    openGraph: {
      images: [
        {
          alt: 'Ship Sh!t Show — Think AI',
          height: 630,
          url: defaultCardUrl,
          width: 1200,
        },
      ],
      siteName: 'Ship Sh!t Show',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: [defaultCardUrl],
    },
  };
}
