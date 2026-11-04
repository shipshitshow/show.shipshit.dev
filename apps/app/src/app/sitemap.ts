import type { MetadataRoute } from 'next';
import { ARTIFACTS } from '@/lib/artifacts/registry';
import { listAvailableLivestreamDates } from '@/lib/livestreams-store';
import { toAbsoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dates = await listAvailableLivestreamDates();
  return [
    { priority: 1, url: toAbsoluteUrl('/') },
    { url: toAbsoluteUrl('/artifacts') },
    ...ARTIFACTS.map(({ slug, updated }) => ({
      lastModified: new Date(`${updated}T00:00:00Z`),
      url: toAbsoluteUrl(`/artifacts/${slug}`),
    })),
    ...dates.map((date) => ({
      lastModified: new Date(`${date}T00:00:00Z`),
      url: toAbsoluteUrl(`/talking-points/${date}`),
    })),
  ];
}
