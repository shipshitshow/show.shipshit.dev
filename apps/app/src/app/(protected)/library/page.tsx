import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { ARTIFACTS } from '@/lib/artifacts/registry';
import { LIBRARY_SECTIONS } from '@/lib/library';
import { loadGallery } from '@/lib/library-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Library — ' + BRAND.identity.show_name,
};

export default async function LibraryPage() {
  const [thumbnails, covers] = await Promise.all([
    loadGallery('thumbnails'),
    loadGallery('covers'),
  ]);
  const counts: Record<string, string> = {
    artifacts: String(ARTIFACTS.length),
    covers: covers.ok ? String(covers.items.length) : '—',
    thumbnails: thumbnails.ok ? String(thumbnails.items.length) : '—',
  };
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-7">
      <LibraryHeader
        blurb="Everything the show makes and reuses, in one place."
        title="Library"
      />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {LIBRARY_SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              className="flex h-full items-start gap-4 rounded-2xl border border-surface-border bg-surface-elevated/30 p-6 transition-colors hover:border-accent-red/50"
              href={section.href}
            >
              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  {section.title}
                  {counts[section.id] ? (
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      {counts[section.id]}
                    </span>
                  ) : null}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {section.blurb}
                </p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
