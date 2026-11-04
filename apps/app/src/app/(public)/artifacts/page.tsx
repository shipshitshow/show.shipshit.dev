import { BRAND } from '@shipshitshow/ui/brand';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtifactCards } from '@/components/artifacts/ArtifactCards';
import { BrandMark } from '@/components/BrandMark';
import { buildDefaultMetadata } from '@/lib/site';

export const metadata: Metadata = {
  ...buildDefaultMetadata(),
  description: `Assets made to show during the ${BRAND.identity.show_name} livestream: timelines, tweet slideshows and more.`,
  title: `Artifacts library — ${BRAND.identity.show_name}`,
};

export default function ArtifactsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-3 text-lg font-bold text-text-primary"
      >
        <BrandMark size={32} className="text-accent-red" />
        {BRAND.identity.show_name}
      </Link>
      <h1 className="mt-10 text-balance text-4xl font-bold text-text-primary md:text-5xl">
        Artifacts library
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-text-secondary">
        Assets we made to show during the livestream. Each one lists its sources
        and how far we checked them.
      </p>
      <div className="mt-10">
        <ArtifactCards />
      </div>
    </main>
  );
}
