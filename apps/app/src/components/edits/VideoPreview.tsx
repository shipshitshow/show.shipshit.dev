'use client';

import { Button, cn } from '@shipshitshow/ui';
import {
  type Ref,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  cutReviewStart,
  type EditRange,
  type EditWord,
  formatClock,
  rangeAt,
  wordAt,
} from '@/lib/transcript-edit';

export interface PlayerHandle {
  /** Play from `seconds` on the recording's clock. */
  playFrom(seconds: number): void;
}

interface Latest {
  onWord: (word: EditWord | null) => void;
  ranges: readonly EditRange[];
  skip: boolean;
}

/**
 * The recording next to the transcript. While it plays, cut ranges are
 * skipped, so you hear the edit as it stands now and every change shows up on
 * the next play. The strip under the video marks the cuts over the whole
 * recording.
 */
export function VideoPreview({
  byTime,
  handle,
  onWord,
  ranges,
  videoUrl,
}: {
  /** The words sorted by start time. */
  byTime: readonly EditWord[];
  handle: Ref<PlayerHandle>;
  /** Called when the word being said changes. */
  onWord: (word: EditWord | null) => void;
  ranges: readonly EditRange[];
  videoUrl: string;
}) {
  const start = byTime[0]?.t0 ?? 0;
  const end = byTime.reduce((max, word) => Math.max(max, word.t1), start);
  const span = Math.max(end - start, 1);
  const cutSeconds = ranges.reduce(
    (sum, range) => sum + (range.b - range.a),
    0,
  );

  const [skip, setSkip] = useState(true);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const lastWord = useRef<number | null>(null);
  // The loop outlives a render, so it reads the current props from here. The
  // video's ref callback refreshes this on every commit.
  const latest = useRef<Latest>({ onWord, ranges, skip });

  function step() {
    const video = videoRef.current;
    if (!video) return;
    const { onWord: report, ranges: current, skip: skipping } = latest.current;
    let t = video.currentTime;
    if (skipping && !video.paused) {
      const hit = rangeAt(current, t);
      if (hit) {
        t = hit.b + 0.02;
        video.currentTime = t;
      }
    }
    if (playheadRef.current)
      playheadRef.current.style.left = `${Math.min(100, Math.max(0, ((t - start) / span) * 100))}%`;
    const word = wordAt(byTime, t);
    if ((word?.idx ?? null) !== lastWord.current) {
      lastWord.current = word?.idx ?? null;
      report(word);
    }
  }

  function loop() {
    step();
    const video = videoRef.current;
    frame.current =
      video && !video.paused && !video.ended ? requestAnimationFrame(loop) : 0;
  }

  function startLoop() {
    if (!frame.current) frame.current = requestAnimationFrame(loop);
  }

  function playFrom(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    // A refused autoplay only means the viewer presses play themselves.
    void video.play().catch(() => undefined);
    step();
  }
  useImperativeHandle(handle, () => ({ playFrom }));

  function review(direction: 1 | -1) {
    const video = videoRef.current;
    if (!video) return;
    const at = cutReviewStart(ranges, video.currentTime, direction);
    if (at !== null) playFrom(at);
  }

  const segments = useMemo(
    () =>
      ranges.map((range) => ({
        left: ((range.a - start) / span) * 100,
        width: Math.max(((range.b - range.a) / span) * 100, 0.15),
      })),
    [ranges, span, start],
  );

  if (failed)
    return (
      <p className="rounded-lg border border-surface-border bg-surface-card p-3 text-sm text-accent-red">
        The video did not load. Check the videoUrl the transcript was pushed
        with.
      </p>
    );

  return (
    <div className="space-y-2">
      <video
        className="aspect-video w-full rounded-lg bg-black"
        controls
        onEnded={step}
        onError={() => setFailed(true)}
        onPause={step}
        onPlay={startLoop}
        onSeeked={step}
        playsInline
        preload="metadata"
        ref={(node) => {
          videoRef.current = node;
          latest.current = { onWord, ranges, skip };
        }}
        src={videoUrl}
      />

      <div className="relative">
        <button
          aria-label="Jump to a place in the recording"
          className="relative block h-6 w-full overflow-hidden rounded bg-surface-card ring-1 ring-surface-border"
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const fraction = (event.clientX - box.left) / box.width;
            const video = videoRef.current;
            if (video) video.currentTime = start + fraction * span;
          }}
          type="button"
        >
          {segments.map((segment) => (
            <span
              className="absolute inset-y-0 bg-accent-red/70"
              key={segment.left}
              style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
            />
          ))}
        </button>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-text-primary"
          ref={playheadRef}
          style={{ left: '0%' }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => playFrom(start)}>Play the edit</Button>
        <Button onClick={() => review(-1)}>Previous cut</Button>
        <Button onClick={() => review(1)}>Next cut</Button>
        <Button
          aria-pressed={skip}
          className={cn(skip && 'border-accent-red text-text-primary')}
          onClick={() => setSkip(!skip)}
        >
          {skip ? 'Skipping cuts' : 'Playing cuts'}
        </Button>
      </div>
      <p className="text-xs text-text-muted tabular-nums">
        Edit runs{' '}
        <b className="text-text-primary">{formatClock(span - cutSeconds)}</b> of{' '}
        {formatClock(span)} · {ranges.length} cuts. Red on the strip is what is
        cut.
      </p>
    </div>
  );
}
