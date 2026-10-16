import { BRAND } from '@shipshitshow/ui/brand';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';

export function BrandPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-6 py-10">
      <Link
        href="/"
        className="flex items-center gap-3 text-xl font-bold text-text-primary"
      >
        <BrandMark size={36} className="text-accent-red" />
        {BRAND.identity.show_name}
      </Link>
      {children}
    </main>
  );
}
