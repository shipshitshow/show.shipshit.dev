'use client';
import {
  BrandMark,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  ImagePlus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  awaitingItems,
  awaitingVersions,
  currentThumbnail,
  isThumbnailItem,
  itemsOfKind,
  paginate,
  THUMBNAIL_KINDS,
  type ThumbnailItem,
  type ThumbnailKind,
  type ThumbnailScope,
  type ThumbnailVersion,
  thumbnailAssetUrl,
  visibleThumbnail,
} from '@/lib/thumbnail-lab';
import {
  EMPTY_RULES,
  RealSizePreview,
  RuleChecklist,
  type RuleChecks,
  type RuleKey,
  type RuleState,
  syncRuleFeedback,
} from './ThumbnailReviewAids';

type Capabilities = { writable: boolean; uploadsAvailable: boolean };
type Decision = 'approve' | 'reject' | 'reopen' | 'revise';
const STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Awaiting review',
  rejected: 'Rejected',
  revise: 'Revision requested',
} as const;
const KIND_LABELS: Record<ThumbnailKind, string> = {
  banner: 'Banner',
  pfp: 'PFP',
  thumbnail: 'Thumbnails',
};
const FORMAT_LABELS: Record<ThumbnailItem['format'], string> = {
  live: 'Livestream',
  short: 'Short',
  video: 'Video',
};

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
    STATUS_LABELS[v.review.status]
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
    [kind, setKind] = useState<ThumbnailKind>('thumbnail'),
    [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null),
    [versionId, setVersionId] = useState(''),
    [feedback, setFeedback] = useState(''),
    [compare, setCompare] = useState(false),
    [large, setLarge] = useState(false),
    [busy, setBusy] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null),
    [prompt, setPrompt] = useState(''),
    [titleDraft, setTitleDraft] = useState(''),
    [rules, setRules] = useState<RuleChecks>(EMPTY_RULES);
  const failedRules = Object.values(rules).includes('fail');
  function setRule(key: RuleKey, state: RuleState) {
    const next = { ...rules, [key]: state };
    setRules(next);
    setFeedback((current) => syncRuleFeedback(current, next));
  }
  const dialog = useRef<HTMLDialogElement>(null),
    importFile = useRef<HTMLInputElement>(null),
    uploadFile = useRef<HTMLInputElement>(null),
    note = useRef<HTMLTextAreaElement>(null),
    keys = useRef<(e: KeyboardEvent) => void>(() => {});
  const active = items.find((item) => item.id === activeId),
    version = active?.versions.find((v) => v.id === versionId);
  const editable = Boolean(
    active &&
      version &&
      (version.review.status === 'pending' ||
        version.review.status === 'revise') &&
      capabilities.writable,
  );
  const reopenable = Boolean(
    active &&
      version &&
      (version.review.status === 'approved' ||
        version.review.status === 'rejected') &&
      capabilities.writable,
  );
  const awaiting = active ? awaitingVersions(active) : [];
  function selectVersion(item: ThumbnailItem, id: string) {
    const v = item.versions.find((row) => row.id === id);
    if (!v) return;
    setVersionId(id);
    setRules(EMPTY_RULES);
    setFeedback(v.review.status === 'revise' ? v.review.feedback : '');
  }
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
    setTitleDraft(item.title);
    setError('');
    setNotice('');
    dialog.current?.scrollTo({ top: 0 });
  }
  function close() {
    setActiveId(null);
    setArtwork(null);
  }
  function updated(item: ThumbnailItem) {
    setItems((rows) => rows.map((row) => (row.id === item.id ? item : row)));
  }
  async function saveTitle(item: ThumbnailItem) {
    const title = titleDraft.trim();
    if (title === item.title) return;
    if (!title) {
      setTitleDraft(item.title);
      return;
    }
    setBusy(item.id);
    setError('');
    try {
      const response = await fetch('/api/labs/thumbnails/' + item.id, {
        body: JSON.stringify({
          action: 'title',
          revision: item.revision,
          title,
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
        throw new Error('Invalid saved title response.');
      updated(body.item);
      setTitleDraft(body.item.title);
      setNotice('Title saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The title was not saved.');
    } finally {
      setBusy(null);
    }
  }
  async function saveDecision(
    item: ThumbnailItem,
    target: ThumbnailVersion,
    action: Decision,
  ): Promise<ThumbnailItem> {
    const response = await fetch('/api/labs/thumbnails/' + item.id, {
      body: JSON.stringify({
        action,
        feedback,
        revision: item.revision,
        versionId: target.id,
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
    return body.item;
  }
  async function reopen(item: ThumbnailItem, target: ThumbnailVersion) {
    setBusy(item.id);
    setError('');
    try {
      await saveDecision(item, target, 'reopen');
      setFeedback('');
      setRules(EMPTY_RULES);
      setNotice('Reopened. It is back in review.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'It was not reopened.');
    } finally {
      setBusy(null);
    }
  }
  async function decide(
    item: ThumbnailItem,
    target: ThumbnailVersion,
    action: 'approve' | 'reject' | 'revise',
  ) {
    // The neighbour is taken before the save so the queue keeps its order.
    const at = visible.findIndex((row) => row.id === item.id);
    const next = at < 0 ? undefined : (visible[at + 1] ?? visible[at - 1]);
    setBusy(item.id);
    setError('');
    try {
      const savedItem = await saveDecision(item, target, action);
      const saved =
        action === 'approve'
          ? 'Approved & locked. The other variations are rejected.'
          : action === 'reject'
            ? 'Rejected.'
            : 'Revision saved.';
      const stillOpen = awaitingVersions(savedItem)[0];
      if (stillOpen) {
        // Other variations still need a decision: stay on this thumbnail.
        selectVersion(savedItem, stillOpen.id);
        setNotice(saved + ' Choose the next variation.');
      } else if (next) {
        open(next);
        setNotice(saved + ' Next thumbnail opened.');
      } else {
        close();
        setNotice(at < 0 ? saved : saved + ' Nothing left in this view.');
      }
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
  const kindItems = itemsOfKind(items, kind);
  const awaitingCount = awaitingItems(kindItems).length;
  // One entry per video. The list arrives newest publish date first.
  const visible = kindItems.filter(
    (item) =>
      visibleThumbnail(item, scope) &&
      (!search.trim() ||
        (item.title + ' ' + item.id)
          .toLowerCase()
          .includes(search.toLowerCase().trim())),
  );
  const paged = paginate(visible, page);
  const button =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40';
  // Card actions share a row of three equal columns, so they must never size
  // from their content or they overflow a narrow card.
  const cardAction = button.replace(' px-3 ', ' px-1.5 ') + ' min-w-0 gap-1.5';
  const activeIndex = visible.findIndex((row) => row.id === activeId);
  function go(step: number) {
    const target = activeIndex < 0 ? undefined : visible[activeIndex + step];
    if (target) open(target);
  }
  function onKey(e: KeyboardEvent) {
    if (!active || e.repeat || e.isComposing) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (version && editable && !busy && feedback.trim()) {
        e.preventDefault();
        decide(active, version, 'revise');
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target;
    if (
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ||
        el.getAttribute('role') === 'combobox' ||
        el.closest('[role="listbox"]'))
    )
      return;
    const key = e.key.toLowerCase();
    if (key === 'arrowright') {
      e.preventDefault();
      go(1);
    } else if (key === 'arrowleft') {
      e.preventDefault();
      go(-1);
    } else if (key === 'a' && version && editable && !busy && !failedRules) {
      e.preventDefault();
      decide(active, version, 'approve');
    } else if (key === 'x' && version && editable && !busy) {
      e.preventDefault();
      decide(active, version, 'reject');
    } else if (key === 'r' && editable) {
      e.preventDefault();
      note.current?.focus();
    }
  }
  useEffect(() => {
    keys.current = onKey;
  });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  if (loading && !items.length)
    return <p className="p-12 text-sm text-text-muted">Loading thumbnails…</p>;
  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold">Thumbnails</h1>
          <p className="text-xs text-text-muted">
            {awaitingCount} awaiting review
          </p>
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
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border py-3">
        <nav className="flex gap-1" aria-label="Thumbnail view">
          {(['pending', 'all'] satisfies ThumbnailScope[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setScope(tab);
                setPage(1);
              }}
              aria-pressed={scope === tab}
              className={
                'min-h-9 rounded-lg px-3 text-xs ' +
                (scope === tab
                  ? 'bg-text-primary text-surface'
                  : 'bg-surface-elevated text-text-secondary')
              }
            >
              {tab === 'pending' ? 'To review' : 'All'}
            </button>
          ))}
        </nav>
        <nav className="flex gap-1" aria-label="Asset type">
          {THUMBNAIL_KINDS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setKind(tab);
                setPage(1);
              }}
              aria-pressed={kind === tab}
              className={
                'min-h-9 rounded-lg px-3 text-xs ' +
                (kind === tab
                  ? 'bg-text-primary text-surface'
                  : 'bg-surface-elevated text-text-secondary')
              }
            >
              {KIND_LABELS[tab]}
            </button>
          ))}
        </nav>
        <label className="ml-auto flex items-center gap-2 rounded-full border border-surface-border px-4 py-2">
          <Search size={14} className="text-text-muted" />
          <input
            aria-label="Search videos or ID"
            className="w-44 bg-transparent text-xs outline-none md:w-60"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
        {paged.items.map((item) => {
          const v = currentThumbnail(item),
            pendingCount = awaitingVersions(item).length;
          return (
            <article key={item.id} className="group min-w-0">
              <button
                className={
                  (item.format === 'short'
                    ? 'mx-auto block aspect-[9/16] w-3/5'
                    : 'block aspect-video w-full') +
                  ' overflow-hidden rounded-xl bg-surface-elevated outline outline-1 -outline-offset-1 outline-white/10'
                }
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
                    <span>{FORMAT_LABELS[item.format]}</span>
                    <span
                      className={
                        pendingCount ? 'text-amber-400' : 'text-text-muted'
                      }
                    >
                      {pendingCount
                        ? pendingCount +
                          (pendingCount === 1
                            ? ' variation to review'
                            : ' variations to review')
                        : STATUS_LABELS[v.review.status]}
                    </span>
                    <code>{item.id}</code>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {paged.pageCount > 1 && (
        <nav
          aria-label="Pages"
          className="mt-10 flex items-center justify-center gap-3"
        >
          <button
            className={button}
            disabled={paged.page <= 1}
            onClick={() => setPage(paged.page - 1)}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <span className="text-xs tabular-nums text-text-muted">
            Page {paged.page} of {paged.pageCount}
          </span>
          <button
            className={button}
            disabled={paged.page >= paged.pageCount}
            onClick={() => setPage(paged.page + 1)}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
      {!visible.length && (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">
            {kindItems.length
              ? scope === 'pending'
                ? 'Nothing is waiting for review.'
                : `No ${KIND_LABELS[kind].toLowerCase()} match.`
              : `No ${KIND_LABELS[kind].toLowerCase()} imported yet.`}
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
              <div className="flex items-center gap-2">
                {activeIndex >= 0 && (
                  <>
                    <button
                      className={button}
                      onClick={() => go(-1)}
                      disabled={activeIndex === 0}
                      aria-label="Previous thumbnail"
                      title="Previous (←)"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span
                      className="min-w-16 text-center text-xs tabular-nums text-text-muted"
                      aria-live="polite"
                    >
                      {activeIndex + 1} of {visible.length}
                    </span>
                    <button
                      className={button}
                      onClick={() => go(1)}
                      disabled={activeIndex === visible.length - 1}
                      aria-label="Next thumbnail"
                      title="Next (→)"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <button
                  className={button}
                  onClick={close}
                  aria-label="Close thumbnail"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid lg:grid-cols-[1.7fr_1fr]">
              <div className="min-w-0 bg-surface-elevated/30 p-5">
                <img
                  src={thumbnailAssetUrl(active, version)}
                  alt={active.title}
                  className={
                    active.format === 'short'
                      ? 'mx-auto aspect-[9/16] max-h-[70vh] w-auto rounded-lg object-contain'
                      : 'aspect-video w-full rounded-lg object-contain'
                  }
                />
                <RealSizePreview
                  portrait={active.format === 'short'}
                  alt={active.title + ' at real feed sizes'}
                  src={thumbnailAssetUrl(active, version)}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <History size={14} aria-hidden />
                    <Select
                      value={version.id}
                      onValueChange={(id) => selectVersion(active, id)}
                    >
                      <SelectTrigger
                        aria-label="Thumbnail version"
                        className="h-10 max-w-72 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent container={dialog.current}>
                        {active.versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {versionLabel(active, v)}
                            {v.id === active.currentVersionId
                              ? ' · current'
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {active.pairIds.length > 0 && (
                    <button
                      className={button}
                      onClick={() => setCompare(!compare)}
                    >
                      {compare ? 'Hide twin' : 'Compare with video/live twin'}
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
                {awaiting.length >= 2 && (
                  <section
                    aria-label="Compare variations"
                    className="mt-5 rounded-xl border border-surface-border p-4"
                  >
                    <p className="text-xs font-medium">
                      {awaiting.length} variations need a decision
                    </p>
                    <div
                      className={
                        'mt-3 grid gap-3 ' +
                        (awaiting.length > 2
                          ? 'sm:grid-cols-2 xl:grid-cols-3'
                          : 'sm:grid-cols-2')
                      }
                    >
                      {awaiting.map((v) => (
                        <div
                          key={v.id}
                          className={
                            'rounded-lg border p-2 ' +
                            (v.id === version.id
                              ? 'border-text-primary'
                              : 'border-surface-border')
                          }
                        >
                          <button
                            className="block w-full"
                            onClick={() => selectVersion(active, v.id)}
                            aria-label={'Select ' + versionLabel(active, v)}
                          >
                            <img
                              src={thumbnailAssetUrl(active, v)}
                              alt={versionLabel(active, v)}
                              className={
                                active.format === 'short'
                                  ? 'mx-auto aspect-[9/16] max-h-64 w-auto rounded object-contain'
                                  : 'aspect-video w-full rounded object-contain'
                              }
                            />
                          </button>
                          <p className="mt-2 text-[11px] text-text-muted">
                            {versionLabel(active, v)}
                            {v.id === active.currentVersionId
                              ? ' · current'
                              : ''}
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            <button
                              className={cardAction + ' text-emerald-400'}
                              disabled={!capabilities.writable || !!busy}
                              onClick={() => decide(active, v, 'approve')}
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              className={cardAction}
                              disabled={!capabilities.writable || !!busy}
                              onClick={() => {
                                selectVersion(active, v.id);
                                setTimeout(() => note.current?.focus(), 0);
                              }}
                            >
                              Revise…
                            </button>
                            <button
                              className={cardAction}
                              disabled={!capabilities.writable || !!busy}
                              onClick={() => decide(active, v, 'reject')}
                              aria-label={'Reject ' + versionLabel(active, v)}
                              title="Reject this variation"
                            >
                              <Ban size={14} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
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
                      Use unbranded{' '}
                      {active.format === 'short' ? '9:16' : '16:9'} artwork
                      under 4 MB. The app adds the{' '}
                      {active.format === 'video' ? 'white' : 'red'} star at its
                      fixed position.
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
                  {FORMAT_LABELS[active.format]} ·{' '}
                  {active.format === 'video' ? 'white' : 'red'} ✱ ·{' '}
                  {version.id === active.currentVersionId
                    ? 'Current version'
                    : 'Not current · approving makes it current'}
                </p>
                <h2 id="thumbnail-title" className="sr-only">
                  {active.title}
                </h2>
                <textarea
                  aria-label="Title"
                  className="mt-3 w-full resize-none rounded border border-transparent bg-transparent text-xl font-semibold leading-7 outline-none hover:border-surface-border focus:border-surface-border"
                  maxLength={100}
                  onBlur={() => void saveTitle(active)}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      flushSync(() => setTitleDraft(active.title));
                      e.currentTarget.blur();
                    }
                  }}
                  readOnly={!capabilities.writable}
                  rows={3}
                  value={titleDraft}
                />
                <p className="mt-1 text-[10px] text-text-muted">
                  Saves here only. It does not change YouTube.
                </p>
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
                    : STATUS_LABELS[version.review.status]}
                  {version.review.status === 'rejected' &&
                    version.review.reason && (
                      <span className="mt-1 block">
                        {version.review.reason}
                      </span>
                    )}
                </p>
                <RuleChecklist
                  checks={rules}
                  disabled={!editable || !!busy}
                  onChange={setRule}
                />
                <label className="mt-4 block text-xs">
                  What should change? (optional reason when rejecting)
                  <textarea
                    ref={note}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={!editable || !!busy}
                    maxLength={4000}
                    className="mt-2 min-h-28 w-full rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm disabled:opacity-40"
                    placeholder="One clear note is enough."
                  />
                </label>
                {reopenable ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      className={button + ' flex-1'}
                      disabled={!!busy}
                      onClick={() => reopen(active, version)}
                    >
                      <RotateCcw size={14} />
                      Reopen for review
                    </button>
                    {version.review.status === 'approved' && (
                      <button
                        className={button + ' flex-1'}
                        disabled={!!busy}
                        title="Reject this approved thumbnail"
                        onClick={() => decide(active, version, 'reject')}
                      >
                        <Ban size={14} />
                        Reject
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      className={button + ' flex-1 text-emerald-400'}
                      disabled={!editable || !!busy || failedRules}
                      title={
                        failedRules
                          ? 'A rule is marked Fail. Request a revision instead.'
                          : undefined
                      }
                      onClick={() => decide(active, version, 'approve')}
                    >
                      <Check size={14} />
                      Approve & lock
                    </button>
                    <button
                      className={button + ' flex-1'}
                      disabled={!editable || !!busy || !feedback.trim()}
                      onClick={() => decide(active, version, 'revise')}
                    >
                      Request revision
                    </button>
                    <button
                      className={button + ' flex-1'}
                      disabled={!editable || !!busy}
                      title="Reject (X)"
                      onClick={() => decide(active, version, 'reject')}
                    >
                      <Ban size={14} />
                      Reject
                    </button>
                  </div>
                )}
                <p className="mt-3 text-[10px] leading-5 text-text-muted">
                  Keys: ← → browse · A approve & lock · X reject · R write a
                  note · ⌘/Ctrl+Enter request revision · Esc close. Approving
                  rejects every other variation. Reopen brings one back.
                </p>
                {notice && (
                  <p role="status" className="mt-3 text-xs text-emerald-400">
                    {notice}
                  </p>
                )}
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
