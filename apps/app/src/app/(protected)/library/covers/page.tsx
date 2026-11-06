import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import { ArtworkGallery } from '@/components/library/ArtworkGallery';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { loadGallery } from '@/lib/library-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Covers — Library — ' + BRAND.identity.show_name,
};

export default async function LibraryCoversPage() {
  const gallery = await loadGallery('covers');
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <LibraryHeader title="Covers" />
      {gallery.ok ? (
        <ArtworkGallery items={gallery.items} kind="covers" />
      ) : (
        <p className="mt-8 text-sm text-accent-red" role="alert">
          The catalogue could not be loaded. Try again in a moment.
        </p>
      )}
    </main>
  );
}
