import { cn } from '@shipshitshow/ui';
import Link from 'next/link';
import { LIBRARY_SECTIONS } from '@/lib/library';

export function LibraryHeader({
  active,
  blurb,
  title,
}: {
  active?: (typeof LIBRARY_SECTIONS)[number]['id'];
  blurb: string;
  title: string;
}) {
  return (
    <header>
      <p className="text-[10px] uppercase tracking-[.2em] text-text-muted">
        Library
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
        {blurb}
      </p>
      <nav aria-label="Library sections" className="mt-4 flex flex-wrap gap-2">
        {LIBRARY_SECTIONS.map((section) => (
          <Link
            aria-current={section.id === active ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              section.id === active
                ? 'border-accent-red bg-accent-red/10 text-text-primary'
                : 'border-surface-border text-text-muted hover:border-accent-red/50 hover:text-text-primary',
            )}
            href={section.href}
            key={section.id}
          >
            {section.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
