import { type GalleryKind, itemsForGallery } from './library';
import { logError } from './logger';
import { sortByPublishDate, type ThumbnailItem } from './thumbnail-lab';
import { listThumbnailItems } from './thumbnail-lab-store';
import { fetchPublishDates } from './thumbnail-publish-dates';

export type GalleryData = { items: ThumbnailItem[]; ok: true } | { ok: false };

export async function loadGallery(kind: GalleryKind): Promise<GalleryData> {
  try {
    return {
      items: sortByPublishDate(
        itemsForGallery(await listThumbnailItems(), kind),
        await fetchPublishDates(),
      ),
      ok: true,
    };
  } catch (error) {
    logError('library.gallery_failed', error);
    return { ok: false };
  }
}
