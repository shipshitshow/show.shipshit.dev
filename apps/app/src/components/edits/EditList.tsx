'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import type { EditSummary } from '@/lib/transcript-edit';
import { formatClock } from '@/lib/transcript-edit';

interface EditsResponse {
  edits: EditSummary[];
  writable: boolean;
}

/** The transcripts pushed for editing. */
export function EditList() {
  const query = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<EditsResponse>('/api/edits', 'The edits did not load.', signal),
    queryKey: ['edits'],
  });

  if (query.isPending)
    return <p className="text-sm text-text-muted">Loading…</p>;
  if (query.isError)
    return <p className="text-sm text-accent-red">{query.error.message}</p>;
  const { edits, writable } = query.data;

  if (edits.length === 0)
    return (
      <div className="max-w-xl space-y-2 text-sm text-text-muted">
        <p>No transcript is ready to edit yet.</p>
        <p>
          Push a word-level transcript with{' '}
          <code className="rounded bg-surface-elevated px-1.5 py-0.5 text-text-primary">
            bun run edits:push &lt;id&gt; &lt;file.json&gt;
          </code>
          , then open it here. The format is in{' '}
          <code className="text-text-primary">
            docs/show-prep/transcript-editing.md
          </code>
          .
        </p>
        {writable ? null : (
          <p className="text-accent-red">
            Storage is read-only on this deployment.
          </p>
        )}
      </div>
    );

  return (
    <ul className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-card">
      {edits.map((edit) => (
        <li key={edit.id}>
          <Link
            className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-surface-elevated/50"
            href={`/library/edits/${encodeURIComponent(edit.id)}`}
          >
            <span className="font-medium">{edit.title}</span>
            <span className="text-xs text-text-muted tabular-nums">
              {formatClock(edit.duration)} · {edit.words.toLocaleString('en')}{' '}
              words
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
