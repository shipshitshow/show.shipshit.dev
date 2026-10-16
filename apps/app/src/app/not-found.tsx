import { Button } from '@shipshitshow/ui';
import Link from 'next/link';
import { BrandPageShell } from '@/components/BrandPageShell';

export default function NotFound() {
  return (
    <BrandPageShell>
      <section className="max-w-lg text-center">
        <p className="text-sm text-text-muted">404</p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">
          Page not found
        </h1>
        <p className="mt-4 text-text-secondary">
          This page is unavailable. Head back to the show for the latest
          episodes.
        </p>
        <Button variant="accent" size="lg" className="mt-6" asChild>
          <Link href="/">Back to the show</Link>
        </Button>
      </section>
    </BrandPageShell>
  );
}
