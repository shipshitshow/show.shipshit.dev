'use client';

import { Button, cn } from '@shipshitshow/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { FilterSelect } from '@/components/FilterSelect';
import { fetchJson } from '@/lib/fetch-json';
import {
  buildCuts,
  CUT_CATEGORIES,
  CUT_CATEGORY_ORDER,
  type CutCategory,
  cutStats,
  type EditCuts,
  type EditSession,
  type EditWord,
  formatClock,
  sectionsOf,
  stutterAndLikeIds,
  suggestedCuts,
  wordsInSection,
} from '@/lib/transcript-edit';

interface EditDetail {
  cuts: EditCuts | null;
  session: EditSession;
  writable: boolean;
}

/** Underline that says why a word is suggested. */
const CATEGORY_UNDERLINE: Record<CutCategory, string> = {
  D: 'border-cyan-400',
  E: 'border-pink-400',
  F: 'border-amber-400',
  H: 'border-accent-red',
  R: 'border-emerald-400',
  S: 'border-purple-400',
};
const SPEAKER_COLORS = ['text-accent-red', 'text-emerald-400', 'text-sky-400'];

type LikeMode = 'filler' | 'all';
const LIKE_OPTIONS = [
  { label: 'Filler “like” only', value: 'filler' },
  { label: 'Every “like”', value: 'all' },
] as const;

type SaveState =
  | { kind: 'error'; message: string }
  | { kind: 'idle' }
  | { kind: 'saved' }
  | { kind: 'saving' };

async function putCuts(id: string, cuts: EditCuts): Promise<void> {
  const response = await fetch(`/api/edits/${encodeURIComponent(id)}/cuts`, {
    body: JSON.stringify(cuts),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? 'The cuts were not saved.');
  }
}

function subscribeSelection(notify: () => void) {
  document.addEventListener('selectionchange', notify);
  return () => document.removeEventListener('selectionchange', notify);
}
const hasTextSelection = () => Boolean(window.getSelection()?.toString());

/** The ids of the words a selection touches inside `root`. */
function selectedWordIds(root: HTMLElement | null): number[] {
  const selection = window.getSelection();
  if (
    !root ||
    !selection ||
    selection.isCollapsed ||
    selection.rangeCount === 0
  )
    return [];
  const range = selection.getRangeAt(0);
  const ids: number[] = [];
  for (const element of root.querySelectorAll<HTMLElement>('[data-i]'))
    if (range.intersectsNode(element)) ids.push(Number(element.dataset.i));
  return ids;
}

export function TranscriptEditor({ id }: { id: string }) {
  const query = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<EditDetail>(
        `/api/edits/${encodeURIComponent(id)}`,
        'This transcript did not load.',
        signal,
      ),
    queryKey: ['edit', id],
    refetchOnMount: 'always',
    staleTime: 0,
  });

  if (query.isPending)
    return <p className="text-sm text-text-muted">Loading transcript…</p>;
  if (query.isError)
    return (
      <div className="space-y-2 text-sm">
        <p className="text-accent-red">{query.error.message}</p>
        <Link className="text-text-muted underline" href="/library/edits">
          Back to edits
        </Link>
      </div>
    );
  return (
    <Editor
      initialCuts={query.data.cuts?.idx ?? null}
      key={query.data.session.id}
      session={query.data.session}
      writable={query.data.writable}
    />
  );
}

function Editor({
  initialCuts,
  session,
  writable,
}: {
  initialCuts: number[] | null;
  session: EditSession;
  writable: boolean;
}) {
  const { words } = session;
  const sections = useMemo(() => sectionsOf(session), [session]);
  const [sectionAt, setSectionAt] = useState('0');
  const [cut, setCut] = useState<ReadonlySet<number>>(
    () => new Set(initialCuts ?? suggestedCuts(words)),
  );
  const [history, setHistory] = useState<ReadonlySet<number>[]>([]);
  const [clean, setClean] = useState(false);
  const [likeMode, setLikeMode] = useState<LikeMode>('filler');
  const [pointer, setPointer] = useState('mouse');
  const [save, setSave] = useState<SaveState>(
    initialCuts ? { kind: 'saved' } : { kind: 'idle' },
  );
  const [copyText, setCopyText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);
  const latest = useRef(cut);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const again = useRef(false);
  const lastApplied = useRef(0);

  const sendCuts = useCallback(async () => {
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    try {
      await putCuts(session.id, buildCuts(words, latest.current));
      setSave({ kind: 'saved' });
    } catch (error) {
      setSave({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'The cuts were not saved.',
      });
    } finally {
      inflight.current = false;
      if (again.current) {
        again.current = false;
        void sendCuts();
      }
    }
  }, [session.id, words]);

  /** Sends a pending save when the editor goes away, so no edit is lost. */
  const rootRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      return () => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
          void sendCuts();
        }
      };
    },
    [sendCuts],
  );

  function commit(next: ReadonlySet<number>, remember = true) {
    if (remember) setHistory((past) => [...past.slice(-99), cut]);
    setCut(next);
    latest.current = next;
    if (!writable) return;
    setSave({ kind: 'saving' });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void sendCuts();
    }, 600);
  }

  function apply(ids: readonly number[], toCut: boolean) {
    const next = new Set(cut);
    let changed = false;
    for (const wordId of ids) {
      if (toCut && !next.has(wordId)) {
        next.add(wordId);
        changed = true;
      } else if (!toCut && next.delete(wordId)) changed = true;
    }
    if (changed) commit(next);
  }

  function applySelection(mode: 'cut' | 'keep' | 'toggle') {
    const ids = selectedWordIds(docRef.current);
    if (ids.length === 0) return;
    const toCut =
      mode === 'toggle'
        ? !ids.every((wordId) => cut.has(wordId))
        : mode === 'cut';
    apply(ids, toCut);
    window.getSelection()?.removeAllRanges();
    lastApplied.current = Date.now();
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    commit(previous, false);
  }

  const section = sections[Number(sectionAt)] ?? sections[0];
  const sectionWords = useMemo(
    () => (section ? wordsInSection(session, section) : []),
    [section, session],
  );
  const stats = useMemo(() => cutStats(words, cut), [words, cut]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<CutCategory, { cut: number; total: number }>();
    for (const word of words) {
      if (!word.flag) continue;
      const entry = counts.get(word.flag) ?? { cut: 0, total: 0 };
      entry.total += 1;
      if (cut.has(word.idx)) entry.cut += 1;
      counts.set(word.flag, entry);
    }
    return counts;
  }, [words, cut]);
  const stutterLike = useMemo(() => stutterAndLikeIds(words), [words]);
  const stutterLikeIds =
    likeMode === 'all'
      ? [...stutterLike.stutters, ...stutterLike.allLike]
      : [...stutterLike.stutters, ...stutterLike.fillerLike];
  const stutterLikeLeft = stutterLikeIds.filter((wordId) => !cut.has(wordId));
  const selecting = useSyncExternalStore(
    subscribeSelection,
    hasTextSelection,
    () => false,
  );

  async function copyCuts() {
    const text = JSON.stringify(buildCuts(words, cut), null, 1);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyText(text);
    }
  }

  const status = !writable
    ? 'Storage is read-only here. Use Copy cuts.'
    : save.kind === 'saving'
      ? 'Saving…'
      : save.kind === 'saved'
        ? 'Saved'
        : save.kind === 'error'
          ? `Not saved: ${save.message}`
          : 'Suggestions loaded, nothing saved yet';

  const doc = useMemo(
    () => renderBlocks(sectionWords, session.speakers, cut),
    [sectionWords, session.speakers, cut],
  );

  return (
    <div
      className={cn('space-y-4', clean && '[&_.edit-cut]:hidden')}
      ref={rootRef}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
          event.preventDefault();
          undo();
        }
      }}
      tabIndex={-1}
    >
      <header className="space-y-1">
        <Link
          className="text-xs text-text-muted hover:text-text-primary"
          href="/library/edits"
        >
          Edits
        </Link>
        <h1 className="text-2xl font-semibold">{session.title}</h1>
        <p className="max-w-[62ch] text-sm text-text-muted">
          Highlight text to cut it, or click one word. Highlight cut text to
          bring it back. The underline says why a word was suggested.
        </p>
      </header>

      <div className="md:sticky md:top-0 z-10 space-y-2 border-b border-surface-border bg-surface/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-label="Previous section"
            disabled={Number(sectionAt) === 0}
            onClick={() => setSectionAt(String(Number(sectionAt) - 1))}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <FilterSelect
            className="min-w-44"
            label="Section"
            onChange={setSectionAt}
            options={sections.map((entry, at) => ({
              label: entry.title,
              value: String(at),
            }))}
            value={sectionAt}
          />
          <Button
            aria-label="Next section"
            disabled={Number(sectionAt) >= sections.length - 1}
            onClick={() => setSectionAt(String(Number(sectionAt) + 1))}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="size-4" />
          </Button>
          <FilterSelect
            className="min-w-44"
            label="Cut or restore a category"
            onChange={(category) => {
              const ids = words
                .filter((word) => word.flag === category)
                .map((word) => word.idx);
              apply(ids, !ids.every((wordId) => cut.has(wordId)));
            }}
            options={CUT_CATEGORY_ORDER.filter((key) =>
              categoryCounts.has(key),
            ).map((key) => {
              const count = categoryCounts.get(key);
              return {
                label: `${CUT_CATEGORIES[key].label} · ${count?.cut}/${count?.total} cut`,
                value: key,
              };
            })}
            placeholder="Cut by category"
            value=""
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={stutterLikeLeft.length === 0}
            onClick={() => apply(stutterLikeIds, true)}
            variant="accent"
          >
            Delete all stutters and “like”
          </Button>
          <FilterSelect
            className="min-w-44"
            label="Which “like” words to delete"
            onChange={(mode: LikeMode) => setLikeMode(mode)}
            options={LIKE_OPTIONS}
            value={likeMode}
          />
          <span className="text-xs text-text-muted tabular-nums">
            {stutterLikeLeft.length === 0
              ? 'All cut'
              : `${stutterLikeLeft.length} left in the whole transcript`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={history.length === 0} onClick={undo}>
            Undo
          </Button>
          <Button onClick={() => setClean(!clean)}>
            {clean ? 'Show cuts' : 'Read clean'}
          </Button>
          <Button
            onClick={() => commit(suggestedCuts(words))}
            variant="default"
          >
            Reset to suggestions
          </Button>
          <span className="flex-1" />
          <Button onClick={copyCuts} variant="accent">
            {copied ? 'Copied' : 'Copy cuts'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted tabular-nums">
          <span>
            Cut <b className="text-text-primary">{stats.cutWords}</b> words ·{' '}
            <b className="text-text-primary">{stats.cutSeconds.toFixed(1)}</b>s
          </span>
          <span>
            Kept <b className="text-text-primary">{stats.keptWords}</b> words
          </span>
          <span className="ml-auto" role="status">
            {status}
          </span>
        </div>
      </div>

      {copyText ? (
        <textarea
          aria-label="Cuts to copy"
          className="h-40 w-full rounded-lg border border-surface-border bg-surface-card p-3 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={copyText}
        />
      ) : null}
      <div
        className="space-y-4"
        onClick={(event) => {
          const element = (event.target as HTMLElement).closest<HTMLElement>(
            '[data-i]',
          );
          if (!element || Date.now() - lastApplied.current < 250) return;
          if (window.getSelection()?.toString()) return;
          const wordId = Number(element.dataset.i);
          apply([wordId], !cut.has(wordId));
        }}
        onMouseUp={() => {
          if (pointer === 'mouse') applySelection('toggle');
        }}
        onPointerDown={(event) => setPointer(event.pointerType || 'mouse')}
        ref={docRef}
      >
        {doc}
      </div>

      {selecting && pointer !== 'mouse' ? (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center gap-2">
          <Button onClick={() => applySelection('cut')} variant="accent">
            Cut selection
          </Button>
          <Button onClick={() => applySelection('keep')}>Restore</Button>
        </div>
      ) : null}
    </div>
  );
}

function renderBlocks(
  sectionWords: readonly EditWord[],
  speakers: readonly string[],
  cut: ReadonlySet<number>,
) {
  const blocks: Array<{ start: EditWord; words: EditWord[] }> = [];
  for (const word of sectionWords) {
    const block = blocks.at(-1);
    if (block && block.start.turn === word.turn && block.start.spk === word.spk)
      block.words.push(word);
    else blocks.push({ start: word, words: [word] });
  }
  return blocks.map((block) => (
    <div
      className="grid gap-x-4 sm:grid-cols-[88px_minmax(0,1fr)]"
      key={block.start.idx}
    >
      <div
        className={cn(
          'select-none pt-1 text-xs font-semibold uppercase tracking-wide',
          SPEAKER_COLORS[block.start.spk % SPEAKER_COLORS.length],
        )}
      >
        {speakers[block.start.spk]}
        <span className="ml-2 font-normal normal-case text-text-muted tabular-nums sm:ml-0 sm:block">
          {formatClock(block.start.t0)}
        </span>
      </div>
      <p className="min-w-0 break-words text-lg leading-8">
        {block.words.map((word, at) => (
          <span key={word.idx}>
            {at > 0 ? ' ' : ''}
            <span
              className={cn(
                'cursor-pointer rounded-sm border-b-2 hover:bg-text-primary/10',
                word.flag
                  ? CATEGORY_UNDERLINE[word.flag]
                  : 'border-transparent',
                cut.has(word.idx) &&
                  'edit-cut bg-accent-red/20 text-accent-red line-through',
              )}
              data-i={word.idx}
            >
              {word.text}
            </span>
          </span>
        ))}
      </p>
    </div>
  ));
}
