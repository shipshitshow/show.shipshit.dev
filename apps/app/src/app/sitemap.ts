import type { MetadataRoute } from 'next';
import { listAvailableLivestreamDates } from '@/lib/livestreams-store';
import { toAbsoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dates = await listAvailableLivestreamDates();
  return [
    { priority: 1, url: toAbsoluteUrl('/') },
    ...dates.map((date) => ({
      lastModified: new Date(`${date}T00:00:00Z`),
      url: toAbsoluteUrl(`/talking-points/${date}`),
    })),
  ];
}
