import { ArrowRight, Radio, Telescope } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardClient } from '@/components/DashboardClient';

export const metadata: Metadata = { title: 'Home — Ship Sh!t Show' };

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <p className="mb-2 text-xs text-text-muted">Ship Sh!t Show</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          What are we shipping next?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Prepare the show, follow the channels, and turn the conversation into
          something useful.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/livestreams"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2.5 text-sm hover:bg-surface-border"
        >
          <Radio size={16} aria-hidden="true" />
          Prepare a show
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link
          href="/research"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated"
        >
          <Telescope size={16} aria-hidden="true" />
          Find the next topic
        </Link>
      </div>
      <DashboardClient view="overview" />
    </div>
  );
}
