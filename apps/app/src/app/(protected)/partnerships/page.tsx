import { ArrowRight, Handshake } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Partnerships — Ship Sh!t Show' };
export default function PartnershipsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold">Partnerships</h1>
      <p className="mt-2 text-sm text-text-secondary">
        A place for the collaborations behind the show.
      </p>
      <section className="mt-8 rounded-lg border border-surface-border p-6">
        <Handshake
          size={24}
          className="mb-4 text-text-secondary"
          aria-hidden="true"
        />
        <h2 className="text-base font-medium">
          The partnership pipeline is coming next
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          Company contacts, follow-ups, deals and episode deliverables need
          their own pipeline. For now, the audience leads log is available for
          inbound enquiries.
        </p>
        <Link
          href="/leads"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-surface-elevated px-4 py-2.5 text-sm hover:bg-surface-border"
        >
          Open audience leads
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
