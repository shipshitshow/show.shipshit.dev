import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { ArtworkGallery } from '@/components/library/ArtworkGallery';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { loadGallery } from '@/lib/library-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thumbnails — Library — ' + BRAND.identity.show_name,
};

export default async function LibraryThumbnailsPage() {
  const gallery = await loadGallery('thumbnails');
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <LibraryHeader
        active="thumbnails"
        blurb="16:9 artwork for edited videos and livestreams. Video thumbnails carry the white asterisk, livestreams the red one."
        title="Thumbnails"
      />
      {gallery.ok ? (
        <ArtworkGallery items={gallery.items} kind="thumbnails" />
      ) : (
        <p className="mt-8 text-sm text-accent-red" role="alert">
          The catalogue could not be loaded. Try again in a moment.
        </p>
      )}
    </main>
  );
}
