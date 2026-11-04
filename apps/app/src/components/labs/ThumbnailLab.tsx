'use client';
import { BrandMark } from '@shipshitshow/ui';
import { Check, Download, History, ImagePlus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  currentThumbnail,
  isThumbnailItem,
  type ThumbnailItem,
  type ThumbnailScope,
  type ThumbnailVersion,
  thumbnailAssetUrl,
  visibleThumbnail,
} from '@/lib/thumbnail-lab';
import {
  EMPTY_RULES,
  RealSizePreview,
  ReferenceRail,
  RuleChecklist,
  type RuleChecks,
  type RuleKey,
  type RuleState,
  syncRuleFeedback,
} from './ThumbnailReviewAids';

type Capabilities = { writable: boolean; uploadsAvailable: boolean };
function parseItems(value: unknown): ThumbnailItem[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isThumbnailItem)
  )
    throw new Error('The thumbnail catalogue response was invalid.');
  return value.items;
}
async function responseError(response: Response): Promise<Error> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
    )
      return new Error(body.error);
  } catch {}
  return new Error('The request failed (' + response.status + '). Try again.');
}
function versionLabel(item: ThumbnailItem, v: ThumbnailVersion) {
  return (
    'Version ' +
    (item.versions.findIndex((version) => version.id === v.id) + 1) +
    ' · ' +
    (v.review.status === 'revise' ? 'Revision requested' : v.review.status)
  );
}
export function ThumbnailLab() {
  const [items, setItems] = useState<ThumbnailItem[]>([]),
    [capabilities, setCapabilities] = useState<Capabilities>({
      uploadsAvailable: false,
      writable: false,
    });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [scope, setScope] = useState<ThumbnailScope>('pending'),
    [format, setFormat] = useState(''),
    [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null),
    [versionId, setVersionId] = useState(''),
    [feedback, setFeedback] = useState(''),
    [compare, setCompare] = useState(false),
    [large, setLarge] = useState(false),
    [busy, setBusy] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null),
    [prompt, setPrompt] = useState(''),
    [rules, setRules] = useState<RuleChecks>(EMPTY_RULES);
  const failedRules = Object.values(rules).includes('fail');
  function setRule(key: RuleKey, state: RuleState) {
    const next = { ...rules, [key]: state };
    setRules(next);
    setFeedback((current) => syncRuleFeedback(current, next));
  }
  const dialog = useRef<HTMLDialogElement>(null),
    importFile = useRef<HTMLInputElement>(null),
    uploadFile = useRef<HTMLInputElement>(null);
  const active = items.find((item) => item.id === activeId),
    version = active?.versions.find((v) => v.id === versionId);
  const editable = Boolean(
    active &&
      version &&
      version.id === active.currentVersionId &&
      version.review.status !== 'approved' &&
      capabilities.writable,
  );
  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/labs/thumbnails', {
        cache: 'no-store',
      });
      if (!response.ok) throw await responseError(response);
      const body: unknown = await response.json();
      setItems(parseItems(body));
      setCapabilities({
        uploadsAvailable: !!(
          body &&
          typeof body === 'object' &&
          'uploadsAvailable' in body &&
          body.uploadsAvailable === true
        ),
        writable: !!(
          body &&
          typeof body === 'object' &&
          'writable' in body &&
          body.writable === true
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load thumbnails.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const d = dialog.current;
    if (activeId && d && !d.open) d.showModal();
    else if (!activeId && d?.open) d.close();
  }, [activeId]);
  function open(item: ThumbnailItem) {
    const v = currentThumbnail(item);
    setActiveId(item.id);
    setVersionId(v.id);
    setFeedback(v.review.status === 'revise' ? v.review.feedback : '');
    setCompare(false);
    setArtwork(null);
    setRules(EMPTY_RULES);
    setPrompt(v.prompt);
    setError('');
  }
  function close() {
    setActiveId(null);
    setArtwork(null);
  }
  function updated(item: ThumbnailItem) {
    setItems((rows) => rows.map((row) => (row.id === item.id ? item : row)));
  }
  async function decide(item: ThumbnailItem, action: 'approve' | 'revise') {
    setBusy(item.id);
    setError('');
    try {
      const response = await fetch('/api/labs/thumbnails/' + item.id, {
        body: JSON.stringify({
          action,
          feedback,
          revision: item.revision,
          versionId: item.currentVersionId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      if (!response.ok) throw await responseError(response);
      const body: unknown = await response.json();
      if (
        !body ||
        typeof body !== 'object' ||
        !('item' in body) ||
        !isThumbnailItem(body.item)
      )
        throw new Error('Invalid saved review response.');
      updated(body.item);
      close();
      setNotice(
        action === 'approve'
          ? 'Approved & locked. Removed from review.'
          : 'Revision saved. Removed from review.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review was not saved.');
    } finally {
      setBusy(null);
    }
  }
  async function upload() {
    if (!active || !artwork) return;
    setBusy(active.id);
    setError('');
    try {
      const form = new FormData();
      form.set('artwork', artwork);
      form.set('revision', String(active.revision));
      form.set('prompt', prompt);
      const response = await fetch('/api/labs/thumbnails/' + active.id, {
        body: form,
        method: 'POST',
      });
      if (!response.ok) throw await responseError(response);
      const body: unknown = await response.json();
      if (
        !body ||
        typeof body !== 'object' ||
        !('item' in body) ||
        !isThumbnailItem(body.item)
      )
        throw new Error('Invalid version response.');
      updated(body.item);
      close();
      setScope('pending');
      setNotice(
        'New version added to review. Previous versions are preserved.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The version was not saved.');
    } finally {
      setBusy(null);
    }
  }
  async function importReview(file: File) {
    setBusy('import');
    setError('');
    try {
      if (file.size > 2_000_000)
        throw new Error('Review files must be smaller than 2 MB.');
      const body: unknown = JSON.parse(await file.text());
      const catalogue = !!(body && typeof body === 'object' && 'items' in body);
      const response = await fetch(
        catalogue ? '/api/labs/thumbnails' : '/api/labs/thumbnails/reviews',
        {
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      if (!response.ok) throw await responseError(response);
      await load();
      setNotice(
        catalogue
          ? 'Catalogue imported. Existing reviews and versions are preserved.'
          : 'Previous review imported. Approvals and revision requests are saved.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review was not imported.');
    } finally {
      setBusy(null);
      if (importFile.current) importFile.current.value = '';
    }
  }
  const counts = { approved: 0, pending: 0, revise: 0 };
  for (const item of items) counts[currentThumbnail(item).review.status]++;
  const visible = items.filter(
    (item) =>
      visibleThumbnail(item, scope) &&
      (!format || item.format === format) &&
      (!search.trim() ||
        (item.title + ' ' + item.id)
          .toLowerCase()
          .includes(search.toLowerCase().trim())),
  );
  const button =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40';
  if (loading && !items.length)
    return (
      <p className="p-12 text-sm text-text-muted">Loading Thumbnail Lab…</p>
    );
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-card">
            <BrandMark className="h-5 w-5 text-accent-red" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Thumbnail Lab
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              {items.length} videos & livestreams · {counts.pending} awaiting
              review · {counts.approved} approved
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importFile}
            hidden
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importReview(file);
            }}
          />
          <button
            className={button}
            disabled={!!busy || !capabilities.writable}
            onClick={() => importFile.current?.click()}
          >
            Import catalogue / review
          </button>
          <a className={button} href="/api/labs/thumbnails/reviews">
            <Download size={14} />
            Export review
          </a>
        </div>
      </div>
      <ReferenceRail />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-border">
        <nav className="flex gap-6" aria-label="Thumbnail review status">
          {(
            ['pending', 'approved', 'revise', 'all'] satisfies ThumbnailScope[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setScope(tab)}
              aria-pressed={scope === tab}
              className={
                'min-h-12 border-b-2 py-3 text-xs font-medium ' +
                (scope === tab
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted')
              }
            >
              {tab === 'pending'
                ? 'To review'
                : tab === 'approved'
                  ? 'Approved'
                  : tab === 'revise'
                    ? 'Revisions'
                    : 'All thumbnails'}{' '}
              <span className="ml-1 text-[10px] text-text-muted">
                {tab === 'all' ? items.length : counts[tab]}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2 py-4">
        <div className="flex gap-1">
          {[
            ['', 'All'],
            ['video', 'Videos · white ✱'],
            ['live', 'Live · red ✱'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFormat(value)}
              aria-pressed={format === value}
              className={
                'min-h-9 rounded-lg px-3 text-xs ' +
                (format === value
                  ? 'bg-text-primary text-surface'
                  : 'bg-surface-elevated text-text-secondary')
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 rounded-full border border-surface-border px-4 py-2">
          <Search size={14} className="text-text-muted" />
          <input
            aria-label="Search videos or ID"
            className="w-44 bg-transparent text-xs outline-none md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or video ID"
          />
        </label>
        <button className={button} onClick={() => setLarge(!large)}>
          {large ? 'Channel wall' : 'Large previews'}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 text-xs"
        >
          <span>{error}</span>
          <button className={button} onClick={load}>
            Refresh
          </button>
        </div>
      )}
      {!capabilities.writable && (
        <p className="mb-4 rounded-lg border border-surface-border p-3 text-xs text-text-muted">
          Review storage is unavailable. Decisions cannot be saved on this
          deployment.
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-xs text-emerald-400">
          {notice}
        </p>
      )}
      <section
        className={
          'grid gap-x-5 gap-y-8 ' +
          (large
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4')
        }
      >
        {visible.map((item) => {
          const v = currentThumbnail(item);
          return (
            <article key={item.id} className="group min-w-0">
              <button
                className="block aspect-video w-full overflow-hidden rounded-xl bg-surface-elevated outline outline-1 -outline-offset-1 outline-white/10"
                onClick={() => open(item)}
                aria-label={'Inspect ' + item.title}
              >
                <img
                  src={thumbnailAssetUrl(item, v)}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
              <div className="flex gap-2.5 pt-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
                  <BrandMark className="h-3.5 w-3.5 text-accent-red" />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => open(item)}
                    className="block text-left text-[13px] font-semibold leading-5"
                  >
                    <span className="line-clamp-2">{item.title}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-text-muted">
                    <span>
                      {v.review.status === 'approved'
                        ? 'Approved'
                        : v.review.status === 'revise'
                          ? 'Revision queued'
                          : item.format === 'live'
                            ? 'Livestream'
                            : 'Video'}
                    </span>
                    <code>{item.id}</code>
                  </div>
                </div>
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-elevated hover:text-emerald-400 disabled:opacity-30"
                  title="Approve & lock"
                  aria-label={'Approve ' + item.title}
                  disabled={
                    !!busy ||
                    !capabilities.writable ||
                    v.review.status === 'approved'
                  }
                  onClick={() => decide(item, 'approve')}
                >
                  <Check size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </section>
      {!visible.length && (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">
            {items.length
              ? 'No thumbnails in this view.'
              : 'No thumbnails imported yet.'}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Approved thumbnails and revision requests live in their own tabs.
          </p>
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={close}
        onClose={() => setActiveId(null)}
        aria-labelledby="thumbnail-title"
        className="m-auto max-h-[94vh] w-[min(1280px,95vw)] overflow-y-auto rounded-2xl border border-surface-border bg-surface p-0 text-text-primary backdrop:bg-black/75"
      >
        {active && version && (
          <>
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-3">
              <span className="text-[10px] tracking-[.15em] text-text-muted">
                THUMBNAIL LAB
              </span>
              <button
                className={button}
                onClick={close}
                aria-label="Close thumbnail"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid lg:grid-cols-[1.7fr_1fr]">
              <div className="min-w-0 bg-surface-elevated/30 p-5">
                <img
                  src={thumbnailAssetUrl(active, version)}
                  alt={active.title}
                  className="aspect-video w-full rounded-lg object-contain"
                />
                <RealSizePreview
                  alt={active.title + ' at real feed sizes'}
                  src={thumbnailAssetUrl(active, version)}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <History size={14} />
                    <select
                      aria-label="Thumbnail version"
                      className="max-w-60 rounded-lg border border-surface-border bg-surface p-2 text-xs"
                      value={version.id}
                      onChange={(e) => {
                        setVersionId(e.target.value);
                        setRules(EMPTY_RULES);
                        const v = active.versions.find(
                          (v) => v.id === e.target.value,
                        );
                        setFeedback(
                          v?.review.status === 'revise'
                            ? v.review.feedback
                            : '',
                        );
                      }}
                    >
                      {active.versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {versionLabel(active, v)}
                          {v.id === active.currentVersionId ? ' · current' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {active.pairIds.length > 0 && (
                    <button
                      className={button}
                      onClick={() => setCompare(!compare)}
                    >
                      {compare ? 'Hide comparison' : 'Compare live / recap'}
                    </button>
                  )}
                  <button
                    className={button}
                    disabled={
                      !!busy ||
                      !capabilities.writable ||
                      !capabilities.uploadsAvailable
                    }
                    onClick={() => uploadFile.current?.click()}
                  >
                    <ImagePlus size={14} />
                    Add variation
                  </button>
                  <input
                    ref={uploadFile}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      setArtwork(e.target.files?.[0] ?? null);
                      if (uploadFile.current) uploadFile.current.value = '';
                    }}
                  />
                </div>
                {compare && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {active.pairIds.map((id) => {
                      const item = items.find((item) => item.id === id);
                      if (!item) return null;
                      return (
                        <div key={id}>
                          <img
                            src={thumbnailAssetUrl(
                              item,
                              currentThumbnail(item),
                            )}
                            alt={item.title}
                            className="aspect-video w-full rounded-lg object-contain"
                          />
                          <p className="mt-2 text-[10px] text-text-muted">
                            {item.format === 'live'
                              ? 'LIVE · RED ✱'
                              : 'VIDEO · WHITE ✱'}{' '}
                            — {item.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {artwork && (
                  <div className="mt-5 space-y-3 rounded-xl border border-surface-border p-4">
                    <p className="text-xs font-medium">
                      New variation: {artwork.name}
                    </p>
                    <label className="block text-xs text-text-muted">
                      Generation prompt
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-lg border border-surface-border bg-surface p-3 text-xs"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        maxLength={20000}
                      />
                    </label>
                    <p className="text-[11px] text-text-muted">
                      Use unbranded 16:9 artwork under 4 MB. The app adds the{' '}
                      {active.format === 'live' ? 'red' : 'white'} star at the
                      fixed top-right position.
                    </p>
                    <button
                      className={button}
                      onClick={upload}
                      disabled={!!busy}
                    >
                      {busy ? 'Saving…' : 'Upload as new version'}
                    </button>
                    <button
                      className={button}
                      onClick={() => setArtwork(null)}
                      disabled={!!busy}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <aside className="border-t border-surface-border p-5 lg:border-l lg:border-t-0">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">
                  {active.format === 'live'
                    ? 'Livestream · red ✱'
                    : 'Video · white ✱'}{' '}
                  ·{' '}
                  {version.id === active.currentVersionId
                    ? 'Current version'
                    : 'History · read only'}
                </p>
                <h2
                  id="thumbnail-title"
                  className="mt-3 text-xl font-semibold leading-7"
                >
                  {active.title}
                </h2>
                <code className="mt-3 block text-xs text-text-muted">
                  {active.id}
                </code>
                <div className="my-4 flex gap-4 text-xs">
                  <a
                    href={thumbnailAssetUrl(active, version) + '?download=1'}
                    className="underline underline-offset-4"
                  >
                    Download JPEG
                  </a>
                  <a
                    href={'https://www.youtube.com/watch?v=' + active.id}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    Open video ↗
                  </a>
                </div>
                <p className="border-t border-surface-border pt-4 text-xs text-text-muted">
                  {version.review.status === 'approved'
                    ? 'Approved & locked'
                    : version.review.status === 'revise'
                      ? 'Revision requested'
                      : 'Awaiting review'}
                </p>
                <RuleChecklist
                  checks={rules}
                  disabled={!editable || !!busy}
                  onChange={setRule}
                />
                <label className="mt-4 block text-xs">
                  What should change?
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={!editable || !!busy}
                    maxLength={4000}
                    className="mt-2 min-h-28 w-full rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm disabled:opacity-40"
                    placeholder="One clear note is enough."
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    className={button + ' flex-1 text-emerald-400'}
                    disabled={!editable || !!busy || failedRules}
                    title={
                      failedRules
                        ? 'A rule is marked Fail. Request a revision instead.'
                        : undefined
                    }
                    onClick={() => decide(active, 'approve')}
                  >
                    <Check size={14} />
                    Approve & lock
                  </button>
                  <button
                    className={button + ' flex-1'}
                    disabled={!editable || !!busy || !feedback.trim()}
                    onClick={() => decide(active, 'revise')}
                  >
                    Request revision
                  </button>
                </div>
                <p className="mt-3 text-[10px] leading-5 text-text-muted">
                  Decisions save to the app and leave the active queue. Approved
                  versions remain immutable. New variations return for review.
                </p>
                {error && (
                  <p role="alert" className="mt-3 text-xs text-accent-red">
                    {error}
                  </p>
                )}
                <details className="mt-5 text-xs text-text-muted">
                  <summary className="cursor-pointer">
                    {version.review.status === 'revise'
                      ? 'Prepared revision prompt'
                      : 'Generation prompt'}
                  </summary>
                  <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-elevated p-3 text-[11px]">
                    {version.review.status === 'revise'
                      ? version.review.prompt
                      : version.prompt ||
                        'No prompt recorded for this imported version.'}
                  </pre>
                  <button
                    className={button + ' mt-2'}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          version.review.status === 'revise'
                            ? version.review.prompt
                            : version.prompt,
                        );
                        setNotice('Prompt copied.');
                      } catch {
                        setError(
                          'Clipboard access is unavailable. Select the prompt text to copy it.',
                        );
                      }
                    }}
                  >
                    Copy prompt
                  </button>
                </details>
              </aside>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
