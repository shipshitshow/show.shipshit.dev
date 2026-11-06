import { type GalleryKind, itemsForGallery } from './library';
import { logError } from './logger';
import { type ThumbnailItem } from './thumbnail-lab';
import { listThumbnailItems } from './thumbnail-lab-store';

export type GalleryData = { items: ThumbnailItem[]; ok: true } | { ok: false };

export async function loadGallery(kind: GalleryKind): Promise<GalleryData> {
  try {
    return {
      items: itemsForGallery(await listThumbnailItems(), kind),
      ok: true,
    };
  } catch (error) {
    logError('library.gallery_failed', error);
    return { ok: false };
  }
}
