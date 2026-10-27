'use client';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Heart,
  LayoutGrid,
  Maximize,
  MessageCircle,
  Minimize,
  StickyNote,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  TweetSlide,
  TweetSlideBody,
  TweetSlideMedia,
} from '@/lib/tweet-slider';

const IDLE_MS = 2500;
const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const COUNT_FORMATTER = new Intl.NumberFormat('en', { notation: 'compact' });
const TOKEN = /(@\w+|#\w+|\b[\w-]+(?:\.[\w-]+)+\/\S*)/g;

function hiddenKey(date: string) {
  return `sss:tweet-slider:hidden:${date}`;
}

function readHidden(date: string): string[] {
  try {
    const raw = window.localStorage.getItem(hiddenKey(date));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeHidden(date: string, ids: string[]) {
  try {
    window.localStorage.setItem(hiddenKey(date), JSON.stringify(ids));
  } catch {}
}

function textSize(length: number, hasMedia: boolean): string {
  if (hasMedia) {
    if (length < 120) return 'text-[clamp(1.75rem,3.2vw,3.75rem)]';
    if (length < 240) return 'text-[clamp(1.5rem,2.6vw,3rem)]';
    return 'text-[clamp(1.25rem,2vw,2.5rem)]';
  }
  if (length < 100) return 'text-[clamp(2.25rem,5vw,6rem)]';
  if (length < 200) return 'text-[clamp(2rem,3.8vw,4.5rem)]';
  if (length < 300) return 'text-[clamp(1.75rem,3vw,3.5rem)]';
  return 'text-[clamp(1.5rem,2.3vw,2.75rem)]';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMATTER.format(date);
}

function TweetText({ className, text }: { className: string; text: string }) {
  return (
    <p className={`whitespace-pre-line break-words leading-snug ${className}`}>
      {text.split(TOKEN).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-accent-red">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Author({
  author,
  compact = false,
}: {
  author: TweetSlideBody['author'];
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-[1vw]">
      <img
        src={author.avatarUrl}
        alt=""
        className={`shrink-0 rounded-full bg-surface-elevated ${
          compact
            ? 'size-[clamp(1.75rem,2.4vw,2.75rem)]'
            : 'size-[clamp(3rem,4.5vw,5.5rem)]'
        }`}
      />
      <div className="min-w-0">
        <p
          className={`truncate font-bold text-text-primary ${
            compact
              ? 'text-[clamp(1rem,1.4vw,1.5rem)]'
              : 'text-[clamp(1.25rem,2vw,2.25rem)]'
          }`}
        >
          {author.name}
          {author.verified && (
            <span
              className="ml-2 align-middle text-[0.7em] text-accent-red"
              title="Verified"
            >
              ✓
            </span>
          )}
        </p>
        <p
          className={`truncate text-text-muted ${
            compact
              ? 'text-[clamp(0.875rem,1.1vw,1.25rem)]'
              : 'text-[clamp(1rem,1.5vw,1.75rem)]'
          }`}
        >
          @{author.handle}
        </p>
      </div>
    </div>
  );
}

function MediaItem({
  className,
  item,
}: {
  className: string;
  item: TweetSlideMedia;
}) {
  if (item.kind === 'photo' || !item.videoUrl) {
    return <img src={item.posterUrl} alt={item.alt} className={className} />;
  }
  return (
    <video
      key={item.videoUrl}
      src={item.videoUrl}
      poster={item.posterUrl}
      className={className}
      controls={item.kind === 'video'}
      autoPlay={item.kind === 'gif'}
      loop={item.kind === 'gif'}
      muted={item.kind === 'gif'}
      playsInline
    />
  );
}

function MediaGrid({ media }: { media: TweetSlideMedia[] }) {
  if (media.length === 1) {
    return (
      <MediaItem
        item={media[0]}
        className="mx-auto max-h-[68vh] w-auto max-w-full rounded-2xl border border-surface-border object-contain"
      />
    );
  }
  return (
    <div className="grid max-h-[68vh] grid-cols-2 gap-[0.6vw] overflow-hidden rounded-2xl border border-surface-border">
      {media.map((item, index) => (
        <MediaItem
          key={`${item.posterUrl}-${index}`}
          item={item}
          className={`h-full max-h-[34vh] w-full object-cover ${
            media.length === 3 && index === 0 ? 'row-span-2 max-h-[68vh]' : ''
          }`}
        />
      ))}
    </div>
  );
}

function QuotedCard({ quoted }: { quoted: TweetSlideBody }) {
  return (
    <div className="space-y-[1vh] rounded-2xl border border-surface-border bg-surface-elevated p-[1.4vw]">
      <Author author={quoted.author} compact />
      {quoted.text && (
        <TweetText
          className="text-[clamp(1rem,1.6vw,1.75rem)] text-text-secondary"
          text={quoted.text}
        />
      )}
      {quoted.media[0] && (
        <MediaItem
          item={quoted.media[0]}
          className="max-h-[24vh] w-auto max-w-full rounded-xl object-contain"
        />
      )}
    </div>
  );
}

function SourceLink({ slide }: { slide: TweetSlide }) {
  return (
    <a
      href={slide.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 hover:text-text-primary"
    >
      <ExternalLink className="size-[1em]" />
      x.com/{slide.tweet?.author.handle ?? slide.handle}
    </a>
  );
}

function SlideCard({ slide }: { slide: TweetSlide }) {
  const { quoted, tweet } = slide;

  if (!tweet) {
    return (
      <article className="w-full max-w-5xl space-y-[3vh] rounded-3xl border border-surface-border bg-surface-card p-[3vw]">
        <p className="text-[clamp(1.5rem,2.6vw,3rem)] font-bold text-text-primary">
          @{slide.handle}
        </p>
        {slide.note && (
          <p className="text-[clamp(1.25rem,2.2vw,2.5rem)] leading-snug text-text-secondary">
            {slide.note}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-[2vw] gap-y-2 text-[clamp(0.875rem,1.2vw,1.25rem)] text-text-muted">
          <span>This post could not be loaded.</span>
          <SourceLink slide={slide} />
        </p>
      </article>
    );
  }

  const hasMedia = tweet.media.length > 0;
  const meta = [
    formatDate(tweet.createdAt),
    tweet.likes !== null ? (
      <span key="likes" className="inline-flex items-center gap-2">
        <Heart className="size-[1em]" />
        {COUNT_FORMATTER.format(tweet.likes)}
      </span>
    ) : null,
    tweet.replies !== null ? (
      <span key="replies" className="inline-flex items-center gap-2">
        <MessageCircle className="size-[1em]" />
        {COUNT_FORMATTER.format(tweet.replies)}
      </span>
    ) : null,
    <SourceLink key="source" slide={slide} />,
  ].filter(Boolean);

  return (
    <article
      className={`grid w-full items-center gap-[3vw] rounded-3xl border border-surface-border bg-surface-card p-[3vw] shadow-2xl shadow-black/60 ${
        hasMedia ? 'max-w-[1800px] lg:grid-cols-[1fr_1.1fr]' : 'max-w-6xl'
      }`}
    >
      <div className="min-w-0 space-y-[3vh]">
        <Author author={tweet.author} />
        {tweet.text && (
          <TweetText
            className={`font-medium text-text-primary ${textSize(
              tweet.text.length,
              hasMedia || Boolean(quoted),
            )}`}
            text={tweet.truncated ? `${tweet.text}…` : tweet.text}
          />
        )}
        {quoted && <QuotedCard quoted={quoted} />}
        <div className="flex flex-wrap items-center gap-x-[2vw] gap-y-2 text-[clamp(0.875rem,1.2vw,1.375rem)] text-text-muted">
          {meta}
        </div>
      </div>
      {hasMedia && (
        <div className="min-w-0">
          <MediaGrid media={tweet.media} />
        </div>
      )}
    </article>
  );
}

function FitToStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;
    const measure = () => {
      const fit = Math.min(
        1,
        stage.clientHeight / Math.max(1, content.offsetHeight),
        stage.clientWidth / Math.max(1, content.offsetWidth),
      );
      setScale(Math.max(0.3, fit));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      className="flex h-full w-full items-center justify-center overflow-auto"
    >
      <div
        ref={contentRef}
        className="flex w-full justify-center"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        {children}
      </div>
    </div>
  );
}

function Overview({
  current,
  hidden,
  onClose,
  onJump,
  onToggleHidden,
  slides,
}: {
  current: string | null;
  hidden: Set<string>;
  onClose: () => void;
  onJump: (id: string) => void;
  onToggleHidden: (id: string) => void;
  slides: TweetSlide[];
}) {
  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-surface/95 p-6 backdrop-blur md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-text-primary">
            All tweets ({slides.length})
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-surface-border p-2 text-text-muted hover:text-text-primary"
            aria-label="Close list"
          >
            <X className="size-5" />
          </button>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, index) => {
            const isHidden = hidden.has(slide.id);
            const preview = slide.tweet?.text || slide.note || slide.url;
            return (
              <li
                key={slide.id}
                className={`flex flex-col rounded-xl border bg-surface-card ${
                  slide.id === current
                    ? 'border-accent-red'
                    : 'border-surface-border'
                } ${isHidden ? 'opacity-40' : ''}`}
              >
                <button
                  onClick={() => onJump(slide.id)}
                  disabled={isHidden}
                  className="flex-1 space-y-2 p-4 text-left disabled:cursor-not-allowed"
                >
                  <p className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="font-mono text-accent-red">
                      {index + 1}
                    </span>
                    {slide.tweet && (
                      <img
                        src={slide.tweet.author.avatarUrl}
                        alt=""
                        className="size-6 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-text-primary">
                      @{slide.tweet?.author.handle ?? slide.handle}
                    </span>
                    {!slide.tweet && <span>(not loaded)</span>}
                  </p>
                  <p className="line-clamp-3 text-sm text-text-secondary">
                    {preview}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {slide.topicTitle}
                  </p>
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-surface-border px-4 py-2 text-xs text-text-muted">
                  <button
                    onClick={() => onToggleHidden(slide.id)}
                    className="hover:text-text-primary"
                  >
                    {isHidden ? 'Show in slider' : 'Skip in slider'}
                  </button>
                  <a
                    href={slide.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-text-primary"
                  >
                    Open on X
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-text-muted">
          Keys: ← → or Space to move, F full screen, N notes, L this list, H
          skip the current tweet, O open on X. Hidden tweets are remembered on
          this browser only.
        </p>
      </div>
    </div>
  );
}

export function TweetSlider({
  backHref,
  date,
  slides,
  title,
}: {
  backHref: string;
  date: string;
  slides: TweetSlide[];
  title: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [currentId, setCurrentId] = useState<string | null>(
    slides[0]?.id ?? null,
  );
  const [showNotes, setShowNotes] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [idle, setIdle] = useState(false);

  const visible = useMemo(
    () => slides.filter((slide) => !hidden.has(slide.id)),
    [hidden, slides],
  );
  const index = Math.max(
    0,
    visible.findIndex((slide) => slide.id === currentId),
  );
  const slide = visible[index] ?? null;
  const next = visible[index + 1] ?? null;

  useEffect(() => {
    setHidden(new Set(readHidden(date)));
    const fromHash = Number.parseInt(window.location.hash.slice(1), 10);
    if (fromHash >= 1 && slides[fromHash - 1]) {
      setCurrentId(slides[fromHash - 1].id);
    }
  }, [date, slides]);

  useEffect(() => {
    if (!slide) return;
    const position = slides.findIndex((item) => item.id === slide.id) + 1;
    window.history.replaceState(null, '', `#${position}`);
  }, [slide, slides]);

  const go = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const target = Math.min(visible.length - 1, Math.max(0, index + delta));
      setCurrentId(visible[target].id);
    },
    [index, visible],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const updated = new Set(hidden);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
        if (id === slide?.id) {
          setCurrentId((visible[index + 1] ?? visible[index - 1])?.id ?? null);
        }
      }
      setHidden(updated);
      writeHidden(date, Array.from(updated));
    },
    [date, hidden, index, slide, visible],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('mousemove', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, video')) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'j':
          event.preventDefault();
          go(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'k':
          event.preventDefault();
          go(-1);
          break;
        case 'Home':
          event.preventDefault();
          go(-visible.length);
          break;
        case 'End':
          event.preventDefault();
          go(visible.length);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'n':
          setShowNotes((value) => !value);
          break;
        case 'l':
        case 'g':
          setShowOverview((value) => !value);
          break;
        case 'h':
          if (slide) toggleHidden(slide.id);
          break;
        case 'o':
          if (slide) window.open(slide.url, '_blank', 'noopener,noreferrer');
          break;
        case 'Escape':
          setShowOverview(false);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, slide, toggleFullscreen, toggleHidden, visible.length]);

  const chrome = `transition-opacity duration-300 ${
    idle && !showOverview ? 'pointer-events-none opacity-0' : 'opacity-100'
  }`;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-surface text-text-primary ${
        idle ? 'cursor-none' : ''
      }`}
    >
      <header
        className={`flex items-center justify-between gap-4 px-6 py-4 ${chrome}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <p className="truncate text-sm text-text-muted">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2 font-mono text-sm text-text-muted">
            {visible.length === 0 ? 0 : index + 1} / {visible.length}
          </span>
          <button
            onClick={() => setShowNotes((value) => !value)}
            className={`rounded-lg border border-surface-border p-2 hover:text-text-primary ${
              showNotes ? 'text-accent-red' : 'text-text-muted'
            }`}
            aria-label="Toggle producer notes"
            title="Notes (N)"
          >
            <StickyNote className="size-5" />
          </button>
          {slide && (
            <a
              href={slide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-surface-border p-2 text-text-muted hover:text-text-primary"
              aria-label="Open this tweet on X"
              title="Open on X (O)"
            >
              <ExternalLink className="size-5" />
            </a>
          )}
          <button
            onClick={() => slide && toggleHidden(slide.id)}
            className="rounded-lg border border-surface-border p-2 text-text-muted hover:text-text-primary"
            aria-label="Skip this tweet"
            title="Skip this tweet (H)"
          >
            <EyeOff className="size-5" />
          </button>
          <button
            onClick={() => setShowOverview((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-text-muted hover:text-text-primary"
            aria-label="Show all tweets"
            title="All tweets (L)"
          >
            <LayoutGrid className="size-5" />
            <span className="text-sm">All tweets</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg border border-surface-border p-2 text-text-muted hover:text-text-primary"
            aria-label="Toggle full screen"
            title="Full screen (F)"
          >
            {isFullscreen ? (
              <Minimize className="size-5" />
            ) : (
              <Maximize className="size-5" />
            )}
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-[5vw] pb-[2vh]">
        {slide ? (
          <FitToStage key={slide.id}>
            <SlideCard slide={slide} />
          </FitToStage>
        ) : (
          <div className="max-w-xl space-y-3 text-center text-text-muted">
            <p className="text-2xl font-semibold text-text-primary">
              No tweets for this episode yet
            </p>
            <p>
              Add X post links to the episode's topic notes. A section titled
              "## Tweets" sets exactly which posts appear and in what order;
              without one, every X post link in the notes is used.
            </p>
          </div>
        )}
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-surface-border bg-surface-card/80 p-3 text-text-muted hover:text-text-primary disabled:invisible ${chrome}`}
          aria-label="Previous tweet"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={index >= visible.length - 1}
          className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-surface-border bg-surface-card/80 p-3 text-text-muted hover:text-text-primary disabled:invisible ${chrome}`}
          aria-label="Next tweet"
        >
          <ChevronRight className="size-6" />
        </button>
        {showOverview && (
          <Overview
            current={slide?.id ?? null}
            hidden={hidden}
            onClose={() => setShowOverview(false)}
            onJump={(id) => {
              setCurrentId(id);
              setShowOverview(false);
            }}
            onToggleHidden={toggleHidden}
            slides={slides}
          />
        )}
      </main>

      {showNotes && slide && (
        <div className="border-t border-surface-border bg-surface-card px-6 py-3 text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">
            {slide.topicTitle}
          </span>
          {slide.note && <span> · {slide.note}</span>}
          {next && (
            <span className="text-text-muted">
              {' '}
              · Next: @{next.tweet?.author.handle ?? next.handle}
            </span>
          )}
        </div>
      )}

      <div className="h-1 w-full bg-surface-elevated">
        <div
          className="h-full bg-accent-red transition-[width] duration-300"
          style={{
            width:
              visible.length === 0
                ? '0%'
                : `${((index + 1) / visible.length) * 100}%`,
          }}
        />
      </div>

      {next?.tweet && (
        <div hidden>
          {next.tweet.media.map((item) => (
            <img key={item.posterUrl} src={item.posterUrl} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}
