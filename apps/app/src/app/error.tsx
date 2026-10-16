'use client';

import { Button } from '@shipshitshow/ui';
import Link from 'next/link';
import { BrandPageShell } from '@/components/BrandPageShell';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <BrandPageShell>
      <section
        className="max-w-lg text-center"
        aria-labelledby="page-error-title"
      >
        <h1
          id="page-error-title"
          className="text-3xl font-bold text-text-primary"
        >
          Something went wrong
        </h1>
        <p className="mt-4 text-text-secondary">
          Try loading the page again, or head back to the show.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="lg" onClick={reset}>
            Try again
          </Button>
          <Button size="lg" asChild>
            <Link href="/">Back to the show</Link>
          </Button>
        </div>
      </section>
    </BrandPageShell>
  );
}
