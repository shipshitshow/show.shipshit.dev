import type { MetadataRoute } from 'next';
import { toAbsoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: ['/', '/api/og'],
      disallow: ['/api/'],
      userAgent: '*',
    },
    sitemap: toAbsoluteUrl('/sitemap.xml'),
  };
}
