'use client';

import { ExternalLink, ImagePlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterSelect } from '@/components/FilterSelect';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import {
  RESOURCE_CATEGORIES,
  RESOURCE_MAX_BYTES,
  type ResourceCategory,
  type ThumbnailResource,
} from '@/lib/thumbnail-resources';

const TITLES: Record<ResourceCategory, string> = {
  brand: 'Branding',
  logos: 'Logos',
  people: 'People',
  products: 'Products',
  style: 'Style references',
};
type Filter = 'all' | ResourceCategory;
const button =
  'inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent-red/50 disabled:opacity-50';

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? 'The request failed.';
}
function ResourceTile({
  resource,
  showCategory,
}: {
  resource: ThumbnailResource;
  showCategory: boolean;
}) {
  return (
    <figure className="m-0 mb-3 break-inside-avoid overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      {resource.url ? (
        <img
          alt={resource.label}
          className="block h-auto w-full bg-neutral-500 object-contain"
          loading="lazy"
          src={resource.url}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center border-b border-dashed border-surface-border text-[10px] uppercase tracking-wider text-text-muted">
          Missing
        </div>
      )}
      <figcaption className="px-3 py-2 text-xs">
        <span className="flex items-center gap-1 font-medium">
          <span className="min-w-0 truncate">{resource.label}</span>
          {resource.source ? (
            <a
              aria-label={'Source for ' + resource.label}
              className="shrink-0 text-text-muted hover:text-text-primary"
              href={resource.source}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={11} />
            </a>
          ) : null}
        </span>
        {showCategory ? (
          <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-text-muted">
            {TITLES[resource.category]}
          </span>
        ) : null}
        {resource.note ? (
          <span className="mt-1 block text-[11px] leading-4 text-text-muted">
            {resource.note}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
export function ThumbnailResources() {
  const [resources, setResources] = useState<ThumbnailResource[] | null>(null);
  const [writable, setWritable] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/labs/thumbnails/resources', {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(await responseError(response));
    const body = await response.json();
    setResources(body.resources);
    setWritable(body.writable !== false);
  }, []);
  useEffect(() => {
    load().catch((failure: Error) => setError(failure.message));
  }, [load]);
  const add = useCallback(
    async (category: ResourceCategory, files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      setError('');
      try {
        for (const file of files) {
          if (file.size > RESOURCE_MAX_BYTES)
            throw new Error(file.name + ' is over 8 MB.');
          const form = new FormData();
          form.set('category', category);
          form.set('file', file);
          const response = await fetch('/api/labs/thumbnails/resources', {
            body: form,
            method: 'POST',
          });
          if (!response.ok) throw new Error(await responseError(response));
        }
        await load();
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : 'The upload failed.',
        );
      } finally {
        setBusy(false);
      }
    },
    [load],
  );
  const [filter, setFilter] = useState<Filter>('all');
  const input = useRef<HTMLInputElement>(null);
  const shown =
    resources?.filter(
      (resource) => filter === 'all' || resource.category === filter,
    ) ?? [];
  const count = (category: Filter) =>
    resources?.filter(
      (resource) => category === 'all' || resource.category === category,
    ).length ?? 0;
  const options = (['all', ...RESOURCE_CATEGORIES] as Filter[]).map(
    (value) => ({
      label: `${value === 'all' ? 'All assets' : TITLES[value]} · ${count(value)}`,
      value,
    }),
  );
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <LibraryHeader title="Assets" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Category"
          onChange={setFilter}
          options={options}
          value={filter}
        />
        {writable && filter !== 'all' ? (
          <>
            <input
              accept="image/png,image/jpeg,image/webp"
              aria-label={'Add to ' + TITLES[filter]}
              className="hidden"
              multiple
              onChange={(event) => {
                add(filter, Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
              ref={input}
              type="file"
            />
            <button
              className={button}
              disabled={busy}
              onClick={() => input.current?.click()}
              type="button"
            >
              <ImagePlus size={14} />
              Add to {TITLES[filter]}
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="mt-4 text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
      {resources === null && !error ? (
        <p className="mt-8 text-sm text-text-muted">Loading assets…</p>
      ) : null}
      {resources && shown.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          {writable
            ? 'No assets here yet. Pick a category to add some.'
            : 'No assets on production yet. Push them from the lab with bun run thumbnail-resources:push.'}
        </p>
      ) : null}
      {shown.length > 0 ? (
        <div className="mt-4 columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-6">
          {shown.map((resource) => (
            <ResourceTile
              key={`${resource.category}/${resource.file ?? resource.url ?? resource.label}`}
              resource={resource}
              showCategory={filter === 'all'}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}
