import { BRAND } from '@shipshitshow/ui/brand';
import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtifactCards } from '@/components/artifacts/ArtifactCards';
import { LibraryHeader } from '@/components/library/LibraryHeader';

export const metadata: Metadata = {
  title: 'Artifacts — Library — ' + BRAND.identity.show_name,
};

export default function LibraryArtifactsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-7">
      <LibraryHeader title="Artifacts" />
      <Link
        className="mt-6 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
        href="/artifacts"
      >
        Public artifacts page
        <ExternalLink size={11} />
      </Link>
      <div className="mt-4">
        <ArtifactCards />
      </div>
    </main>
  );
}
