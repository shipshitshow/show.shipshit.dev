import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowUpRight, Images } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = {
  title: 'Labs — ' + BRAND.identity.show_name,
};
export default function LabsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-[10px] uppercase tracking-[.2em] text-text-muted">
        Producer workspace
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Labs</h1>
      <p className="mt-3 max-w-xl text-sm text-text-secondary">
        Try ideas, compare versions and keep the ones that work.
      </p>
      <Link
        href="/labs/thumbnails"
        className="mt-8 flex max-w-xl items-start gap-4 rounded-2xl border border-surface-border bg-surface-elevated/30 p-6 transition-colors hover:border-accent-red/50"
      >
        <Images className="mt-1 text-accent-red" size={24} />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Thumbnail Lab</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Review the channel wall, compare live and recap artwork, request
            revisions, and save approved versions.
          </p>
        </div>
        <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}
