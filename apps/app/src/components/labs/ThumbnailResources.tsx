'use client';

import { ExternalLink, ImagePlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import {
  RESOURCE_CATEGORIES,
  RESOURCE_MAX_BYTES,
  type ResourceCategory,
  type ThumbnailResource,
} from '@/lib/thumbnail-resources';

const SECTIONS: Record<ResourceCategory, { blurb: string; title: string }> = {
  brand: {
    blurb: 'The asterisk stamps and show artwork. Hosts stay off thumbnails.',
    title: 'Branding',
  },
  logos: {
    blurb: 'Official marks, passed in as inputs so the shapes stay exact.',
    title: 'Logos',
  },
  people: {
    blurb:
      "Reference photos for people the model won't get right from a name alone.",
    title: 'People',
  },
  products: {
    blurb: 'Official product shots and mascots.',
    title: 'Products',
  },
  style: {
    blurb: 'Past work for camera, light and finish only, never to copy.',
    title: 'Style references',
  },
};
const button =
  'inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent-red/50 disabled:opacity-50';

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? 'The request failed.';
}
function ResourceTile({ resource }: { resource: ThumbnailResource }) {
  return (
    <figure className="m-0">
      {resource.url ? (
        <img
          alt={resource.label}
          className="aspect-video w-full rounded-lg bg-neutral-500 object-contain outline outline-1 -outline-offset-1 outline-white/10"
          loading="lazy"
          src={resource.url}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-surface-border text-[10px] uppercase tracking-wider text-text-muted">
          Missing
        </div>
      )}
      <figcaption className="mt-2 text-xs">
        <span className="flex items-center gap-1 font-medium">
          {resource.label}
          {resource.source ? (
            <a
              aria-label={'Source for ' + resource.label}
              className="text-text-muted hover:text-text-primary"
              href={resource.source}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={11} />
            </a>
          ) : null}
        </span>
        {resource.note ? (
          <span className="mt-1 block text-[11px] leading-4 text-text-muted">
            {resource.note}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
function ResourceSection({
  busy,
  category,
  onAdd,
  resources,
  writable,
}: {
  busy: boolean;
  category: ResourceCategory;
  onAdd: (category: ResourceCategory, files: File[]) => void;
  resources: ThumbnailResource[];
  writable: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { blurb, title } = SECTIONS[category];
  return (
    <section className="mt-8 rounded-xl border border-surface-border p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {title}
            <span className="ml-2 text-xs font-normal text-text-muted">
              {resources.length}
            </span>
          </h2>
          <p className="mt-1 text-xs text-text-muted">{blurb}</p>
        </div>
        {writable ? (
          <>
            <input
              accept="image/png,image/jpeg,image/webp"
              aria-label={'Add to ' + title}
              className="hidden"
              multiple
              onChange={(event) => {
                onAdd(category, Array.from(event.target.files ?? []));
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
              Add
            </button>
          </>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {resources.map((resource) => (
          <ResourceTile
            key={resource.file ?? resource.label}
            resource={resource}
          />
        ))}
      </div>
    </section>
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
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <LibraryHeader title="Assets" />
      {writable ? null : (
        <p className="mt-4 text-sm text-text-muted">
          Assets live on the local lab, so this deployment shows only what the
          manifest lists. Add and review them from a local run.
        </p>
      )}
      {error ? (
        <p className="mt-4 text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
      {resources === null && !error ? (
        <p className="mt-8 text-sm text-text-muted">Loading resources…</p>
      ) : null}
      {resources
        ? RESOURCE_CATEGORIES.map((category) => (
            <ResourceSection
              busy={busy}
              category={category}
              key={category}
              onAdd={add}
              writable={writable}
              resources={resources.filter(
                (resource) => resource.category === category,
              )}
            />
          ))
        : null}
    </main>
  );
}
