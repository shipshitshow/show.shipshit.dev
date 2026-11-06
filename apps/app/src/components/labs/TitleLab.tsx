'use client';
import { Download, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  hasLiveTag,
  isDrafts,
  isSnapshot,
  stripLivePrefix,
  summarise,
  TITLE_LIMIT,
  TITLE_TARGET,
  type TitleDrafts,
  type TitleSnapshot,
  type TitleStatus,
  titleLength,
  titleStatus,
} from '@/lib/title-lab';

type Filter = 'all' | 'over' | 'long' | 'ok' | 'drafted' | 'live';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'over', label: `Over ${TITLE_LIMIT}` },
  { id: 'long', label: `${TITLE_TARGET + 1}–${TITLE_LIMIT}` },
  { id: 'ok', label: `${TITLE_TARGET} or fewer` },
  { id: 'drafted', label: 'Has a draft' },
  { id: 'live', label: 'Has [LIVE]' },
];
const STATUS_STYLE: Record<TitleStatus, string> = {
  long: 'border-amber-500/50 text-amber-400',
  ok: 'border-emerald-500/40 text-emerald-400',
  over: 'border-accent-red/60 text-accent-red',
};

function Count({ title }: { title: string }) {
  return (
    <span
      className={`inline-block min-w-9 rounded-md border px-1.5 py-0.5 text-center text-xs tabular-nums ${STATUS_STYLE[titleStatus(title)]}`}
    >
      {titleLength(title)}
    </span>
  );
}

/** About how a phone home feed lays out one title line (approximate). */
function FeedLine({ title }: { title: string }) {
  return (
    <p
      className="w-[300px] max-w-full truncate rounded bg-surface-elevated/40 px-2 py-1 text-[14px] font-medium leading-5"
      title="Approximate width of a phone home-feed title line"
    >
      {title}
    </p>
  );
}

function DraftRow({
  draft,
  onSave,
  video,
}: {
  draft?: string;
  onSave: (id: string, text: string) => Promise<string | null>;
  video: TitleSnapshot['videos'][number];
}) {
  const [text, setText] = useState(draft ?? '');
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(draft ?? '');
  async function commit() {
    if (text.trim() === saved.current) return;
    const failure = await onSave(video.id, text);
    setError(failure);
    if (!failure) saved.current = text.trim();
  }
  return (
    <tr className="border-t border-surface-border align-top">
      <td className="px-3 py-3 text-xs text-text-muted">
        <a
          className="underline-offset-2 hover:underline"
          href={`https://youtu.be/${video.id}`}
          rel="noreferrer"
          target="_blank"
        >
          {video.id}
        </a>
        <div className="mt-1">{video.privacyStatus}</div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Count title={video.title} />
          <span className="text-sm">{video.title}</span>
          {hasLiveTag(video.title) && !text.trim() ? (
            <button
              className="rounded-md border border-accent-red/60 px-2 py-0.5 text-xs text-accent-red"
              onClick={() => {
                const stripped = stripLivePrefix(video.title);
                setText(stripped);
                onSave(video.id, stripped).then((failure) => {
                  setError(failure);
                  if (!failure) saved.current = stripped;
                });
              }}
              type="button"
            >
              Drop [LIVE]
            </button>
          ) : null}
        </div>
        <div className="mt-2">
          <FeedLine title={video.title} />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {text.trim() ? <Count title={text} /> : null}
          <input
            aria-label={`Draft title for ${video.title}`}
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-1.5 text-sm"
            onBlur={commit}
            onChange={(event) => setText(event.target.value)}
            placeholder="One-line draft"
            value={text}
          />
        </div>
        {text.trim() ? (
          <div className="mt-2">
            <FeedLine title={text} />
          </div>
        ) : null}
        {error ? <p className="mt-1 text-xs text-accent-red">{error}</p> : null}
      </td>
    </tr>
  );
}

export function TitleLab() {
  const [snapshot, setSnapshot] = useState<TitleSnapshot | null>(null);
  const [drafts, setDrafts] = useState<TitleDrafts>({});
  const [writable, setWritable] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('over');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/labs/titles')
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok || !body || typeof body !== 'object')
          throw new Error('Could not load the titles.');
        const { drafts, snapshot, writable } = body as Record<string, unknown>;
        if (snapshot !== null && !isSnapshot(snapshot))
          throw new Error('The snapshot was invalid.');
        if (!isDrafts(drafts)) throw new Error('The drafts were invalid.');
        setSnapshot(snapshot);
        setDrafts(drafts);
        setWritable(writable === true);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  async function save(id: string, text: string) {
    const response = await fetch(`/api/labs/titles/${id}`, {
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    const body: unknown = await response.json();
    if (!response.ok)
      return body && typeof body === 'object' && 'error' in body
        ? String(body.error)
        : 'The draft was not saved.';
    if (
      body &&
      typeof body === 'object' &&
      'drafts' in body &&
      isDrafts(body.drafts)
    )
      setDrafts(body.drafts);
    return null;
  }

  const summary = useMemo(
    () => summarise(snapshot?.videos.map((video) => video.title) ?? []),
    [snapshot],
  );
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (snapshot?.videos ?? []).filter((video) => {
      if (needle && !video.title.toLowerCase().includes(needle)) return false;
      if (filter === 'drafted') return Boolean(drafts[video.id]);
      if (filter === 'live') return hasLiveTag(video.title);
      return filter === 'all' || titleStatus(video.title) === filter;
    });
  }, [snapshot, filter, query, drafts]);

  if (state === 'loading')
    return <p className="p-10 text-sm text-text-muted">Loading titles…</p>;
  if (state === 'error')
    return (
      <p className="p-10 text-sm text-accent-red">Could not load titles.</p>
    );
  if (!snapshot)
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Titles Lab</h1>
        <p className="mt-3 text-sm text-text-secondary">
          No snapshot yet. Run <code>bun run youtube:sync</code> to read the
          live titles from YouTube (it only reads). On the deployed site, add{' '}
          <code>--push-redis --namespace production --apply</code> to store it
          here.
        </p>
      </main>
    );

  const drafted = Object.keys(drafts).length;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-[10px] uppercase tracking-[.2em] text-text-muted">
        Producer workspace
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Titles Lab</h1>
      <p className="mt-3 max-w-2xl text-sm text-text-secondary">
        {snapshot.channelTitle}, read from YouTube{' '}
        {snapshot.fetchedAt.slice(0, 16).replace('T', ' ')} UTC. A title must
        fit one line on the home feed, phone included: aim for {TITLE_TARGET}{' '}
        characters or fewer, never over {TITLE_LIMIT}. Drafts are saved by the
        app; nothing here changes YouTube.
      </p>
      <p className="mt-4 text-sm">
        {summary.ok} at {TITLE_TARGET} or fewer · {summary.long} at{' '}
        {TITLE_TARGET + 1}–{TITLE_LIMIT} · {summary.over} over {TITLE_LIMIT} ·{' '}
        {drafted} drafted
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filter === option.id ? 'border-accent-red text-accent-red' : 'border-surface-border text-text-muted'}`}
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm">
          <Search size={14} />
          <input
            aria-label="Search titles"
            className="bg-transparent outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            value={query}
          />
        </label>
        <a
          className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm hover:border-accent-red/50"
          href="/api/labs/titles?export=1"
        >
          <Download size={14} /> Batch file
        </a>
      </div>
      {!writable ? (
        <p className="mt-3 text-xs text-text-muted">
          Drafts need the Redis integration or a local checkout.
        </p>
      ) : null}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-surface-border">
        <table className="w-full min-w-[720px] text-left">
          <thead className="text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 font-normal">Video</th>
              <th className="px-3 py-2 font-normal">Live title</th>
              <th className="px-3 py-2 font-normal">Draft</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((video) => (
              <DraftRow
                draft={drafts[video.id]?.text}
                key={video.id}
                onSave={writable ? save : async () => 'Not writable here.'}
                video={video}
              />
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-sm text-text-muted">Nothing matches.</p>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Apply a batch file with{' '}
        <code>bun run youtube:update --batch title-batch.json</code>. It is a
        dry run until you add <code>--apply</code>.
      </p>
    </main>
  );
}
