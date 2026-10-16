import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Producers only',
};

export default function ProducersOnlyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="font-bold text-2xl text-text-primary">Producers only</h1>
        <p className="text-sm text-text-secondary">
          This account is not a producer for Ship Sh!t Show. The production app
          is limited to the show's producers.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-text-primary underline">
            Back to the show
          </Link>
          <SignOutButton redirectUrl="/">
            <button type="button" className="text-text-secondary underline">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
