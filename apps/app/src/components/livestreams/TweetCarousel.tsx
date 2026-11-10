'use client';

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';
import { MediaItem, TweetText } from '@/components/livestreams/TweetSlider';
import type { TweetSlide, TweetSlideBody } from '@/lib/tweet-slider';

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const COUNT_FORMATTER = new Intl.NumberFormat('en', { notation: 'compact' });

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMATTER.format(date);
}

function Author({ author }: { author: TweetSlideBody['author'] }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={author.avatarUrl}
        alt=""
        className="size-10 shrink-0 rounded-full bg-surface-elevated"
      />
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-text-primary">
          {author.name}
          {author.verified ? (
            <span className="ml-1.5 text-accent-red" title="Verified">
              ✓
            </span>
          ) : null}
        </p>
        <p className="truncate text-sm text-text-muted">@{author.handle}</p>
      </div>
    </div>
  );
}

function SlideBody({ slide }: { slide: TweetSlide }) {
  const { quoted, tweet } = slide;

  if (!tweet) {
    return (
      <div className="space-y-2">
        <p className="text-base font-bold text-text-primary">@{slide.handle}</p>
        {slide.note ? (
          <p className="text-base text-text-secondary">{slide.note}</p>
        ) : null}
        <p className="text-sm text-text-muted">
          This post could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Author author={tweet.author} />
      {tweet.text ? (
        <TweetText
          className="text-lg text-text-primary"
          text={tweet.truncated ? `${tweet.text}…` : tweet.text}
        />
      ) : null}
      {tweet.media[0] ? (
        <MediaItem
          item={tweet.media[0]}
          className="max-h-80 w-auto max-w-full rounded-xl border border-surface-border object-contain"
        />
      ) : null}
      {quoted ? (
        <div className="space-y-2 rounded-xl border border-surface-border bg-surface-elevated p-3">
          <Author author={quoted.author} />
          {quoted.text ? (
            <TweetText
              className="text-base text-text-secondary"
              text={quoted.text}
            />
          ) : null}
          {quoted.media[0] ? (
            <MediaItem
              item={quoted.media[0]}
              className="max-h-48 w-auto max-w-full rounded-lg object-contain"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The segment's tweets as a compact carousel: one post at a time, with arrows. */
export function TweetCarousel({ slides }: { slides: TweetSlide[] }) {
  const [index, setIndex] = useState(0);

  if (slides.length === 0) return null;

  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)];
  const { tweet } = slide;
  const go = (next: number) => setIndex(Math.max(0, Math.min(last, next)));

  return (
    <section
      aria-label="Tweets for this segment"
      aria-roledescription="carousel"
      className="mt-4 rounded-xl border border-surface-border bg-surface p-4"
    >
      <SlideBody slide={slide} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {tweet && formatDate(tweet.createdAt) ? (
            <span>{formatDate(tweet.createdAt)}</span>
          ) : null}
          {tweet && tweet.likes !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-4" />
              {COUNT_FORMATTER.format(tweet.likes)}
            </span>
          ) : null}
          {tweet && tweet.replies !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-4" />
              {COUNT_FORMATTER.format(tweet.replies)}
            </span>
          ) : null}
          <a
            href={slide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-text-primary"
          >
            <ExternalLink className="size-4" />
            Open on X
          </a>
        </p>
        {slides.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous tweet"
              className="rounded-lg border border-surface-border p-1.5 hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-12 text-center font-mono tabular-nums">
              {index + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === last}
              aria-label="Next tweet"
              className="rounded-lg border border-surface-border p-1.5 hover:text-text-primary disabled:opacity-30"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
