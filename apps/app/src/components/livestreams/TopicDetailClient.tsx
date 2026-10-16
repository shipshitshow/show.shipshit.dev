'use client';

import { buildTopicSearchQuery } from '@shipshitshow/talking-points';
import type {
  LivestreamListResponse,
  Topic,
  TrendItem,
  TrendsSearchResponse,
} from '@shipshitshow/types';
import { isErrorResponse } from '@shipshitshow/types';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { LivestreamTopicContentSkeleton } from '@/components/PageSkeletons';
import { logClientEvent, logClientPerf } from '@/lib/client-logger';
import { todayLocalDate } from '@/lib/date';
import { renderInlineMarkdown } from '@/lib/markdown-render';
import { parseJsonResponse } from '@/lib/parse-json-response';
import { clampText, stripMarkdown } from '@/lib/text';

const SOURCE_COLORS: Record<string, string> = {
  GitHub: 'bg-purple-500/20 text-purple-400',
  HN: 'bg-orange-500/20 text-orange-400',
  Reddit: 'bg-orange-600/20 text-orange-300',
  X: 'bg-blue-400/20 text-blue-400',
  YouTube: 'bg-red-500/20 text-red-400',
};

const STATUS_BADGES: Record<string, string> = {
  backlog: 'bg-surface-border text-text-muted',
  done: 'bg-green-500/10 text-green-400',
  draft: 'bg-surface-border/50 text-text-muted/70',
  in_progress: 'bg-accent-red/10 text-text-primary',
};

interface ParsedSection {
  heading: string;
  body: string;
}

interface MarkdownLink {
  text: string;
  url: string;
}

interface LivestreamMeta {
  youtubeUrl: string | null;
  videoId?: string;
  title?: string | null;
  channelTitle?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
  viewCount?: number;
  concurrentViewers?: number | null;
  scheduledStartTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  liveStatus:
    | 'live'
    | 'ended'
    | 'scheduled'
    | 'missing'
    | 'invalid'
    | 'unauthorized'
    | 'error';
}

function stripBlockquotes(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .join('\n');
}

function stripHorizontalRules(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^-{3,}\s*$/.test(line.trim()))
    .join('\n');
}

function parseMarkdownSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const transitionMatch = line.match(/^###\s*→\s*TRANSITION:\s*(.+)/i);
    if (transitionMatch) {
      if (currentHeading) {
        sections.push({
          body: stripHorizontalRules(currentBody.join('\n')).trim(),
          heading: currentHeading,
        });
      }
      currentHeading = `→ ${transitionMatch[1].trim()}`;
      currentBody = [];
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({
          body: stripHorizontalRules(currentBody.join('\n')).trim(),
          heading: currentHeading,
        });
      }
      currentHeading = line.slice(3);
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentHeading) {
    sections.push({
      body: stripHorizontalRules(currentBody.join('\n')).trim(),
      heading: currentHeading,
    });
  }
  return sections;
}

function isTransitionSection(heading: string): boolean {
  return heading.trim().startsWith('→');
}

function shouldIncludeSectionInRundown(heading: string): boolean {
  const normalized = heading.trim().toLowerCase();
  if (/^(cold open|intro)\b/.test(normalized)) return false;
  if (isTransitionSection(heading)) return false;

  return !['summary', 'sources', 'livestream notes', 'hot take'].includes(
    normalized,
  );
}

function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function stripSourcePrefix(text: string): string {
  return text.replace(/^TWEET:\s*/i, '').replace(/^Source:\s*/i, '');
}

function extractMarkdownLinks(text: string): MarkdownLink[] {
  return Array.from(text.matchAll(/\[(.*?)\]\((.*?)\)/g)).map((match) => ({
    text: match[1],
    url: match[2],
  }));
}

function isTweetUrl(url: string): boolean {
  return /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);
}

function isRestreamUrl(url: string): boolean {
  return /studio\.restream\.io/i.test(url);
}

function getEffectiveTopicStatus(topic: Topic): Topic['status'] {
  if (topic.date < todayLocalDate() && topic.status !== 'backlog') {
    return 'done';
  }

  return topic.status;
}

interface TalkingPoint {
  text: string;
  sources: { text: string; url: string }[];
}

function parseTalkingPoints(body: string): TalkingPoint[] {
  const lines = body.split('\n');
  const points: TalkingPoint[] = [];
  let current: TalkingPoint | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith('- ') && !rawLine.startsWith('  - ')) {
      if (current) points.push(current);
      current = { sources: [], text: line.slice(2) };
    } else if (rawLine.startsWith('  - ') && current) {
      const nestedText = rawLine.slice(rawLine.indexOf('- ') + 2).trim();
      const links = extractMarkdownLinks(nestedText);

      if (links.length > 0) {
        current.sources.push(
          ...links.map((link) => ({ text: link.text, url: link.url })),
        );
      }

      const textWithoutLinks = stripMarkdown(nestedText);
      if (textWithoutLinks.length > 0 && links.length === 0) {
        current.text = `${current.text} ${textWithoutLinks}`.trim();
      }
    } else if (current) {
      current.text = `${current.text} ${line.trim()}`.trim();
    }
  }
  if (current) points.push(current);
  return points;
}

interface ShowSegment {
  number: number;
  label: string;
  time: string;
  duration: string;
  points: TalkingPoint[];
  rawText?: string;
  type: 'intro' | 'segment' | 'hottake' | 'conclusion' | 'transition';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatSegmentTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSegmentDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} sec`;
  }
  if (seconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${seconds} sec`;
}

function clampSeconds(
  value: number,
  minSeconds: number,
  maxSeconds: number,
): number {
  return Math.max(minSeconds, Math.min(maxSeconds, Math.round(value)));
}

function buildColdOpenHook(summary?: ParsedSection): string {
  if (!summary?.body) return "Let's get into it.";

  const firstSentence = summary.body
    .split(/(?<=[.!?])\s+/)
    .find((sentence) => sentence.trim().length > 0);
  if (!firstSentence) return "Let's get into it.";

  const words = firstSentence.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 18) return firstSentence.trim();
  return `${words.slice(0, 18).join(' ')}…`;
}

function estimateSegmentSeconds(
  type: ShowSegment['type'],
  points: TalkingPoint[],
  rawText?: string,
): number {
  const pointTextWords = points.reduce(
    (sum, point) => sum + countWords(stripMarkdown(point.text)),
    0,
  );
  const sourceCount = points.reduce(
    (sum, point) => sum + point.sources.length,
    0,
  );
  const rawTextWords = rawText ? countWords(stripMarkdown(rawText)) : 0;
  const totalWords = pointTextWords + rawTextWords;

  switch (type) {
    case 'intro':
      return clampSeconds(totalWords * 4 + 20, 45, 180);
    case 'segment':
      return clampSeconds(
        totalWords * 4 + points.length * 50 + sourceCount * 15,
        180,
        900,
      );
    case 'hottake':
      return clampSeconds(totalWords * 4.5 + 90, 120, 480);
    case 'conclusion':
      return clampSeconds(totalWords * 3.5 + points.length * 35, 120, 360);
    case 'transition':
      return clampSeconds(totalWords * 3 + 15, 15, 60);
  }
}

function buildShowRundown(sections: ParsedSection[]): ShowSegment[] {
  const coldOpen = sections.find((s) =>
    /^(cold open|intro)\b/i.test(s.heading.trim()),
  );
  const summary = sections.find((s) => s.heading === 'Summary');
  const hotTake = sections.find((s) => s.heading === 'Hot Take');

  const segments: ShowSegment[] = [];
  let segNum = 0;
  let currentSeconds = 0;

  const coldOpenBody = coldOpen ? stripBlockquotes(coldOpen.body) : '';
  const introPoints = coldOpen ? parseTalkingPoints(coldOpenBody) : [];
  const introRawText =
    coldOpen && introPoints.length === 0 ? coldOpenBody.trim() : undefined;
  const introHook = buildColdOpenHook(summary);
  const fallbackIntroPoints = [{ sources: [], text: introHook }];
  const resolvedIntroPoints =
    introPoints.length > 0 ? introPoints : fallbackIntroPoints;
  const introSeconds = estimateSegmentSeconds(
    'intro',
    resolvedIntroPoints,
    introRawText,
  );
  segments.push({
    duration: formatSegmentDuration(introSeconds),
    label: 'Cold Open',
    number: segNum++,
    points: resolvedIntroPoints,
    rawText: introRawText,
    time: formatSegmentTime(currentSeconds),
    type: 'intro',
  });
  currentSeconds += introSeconds;

  for (const section of sections) {
    if (isTransitionSection(section.heading)) {
      const transitionBody = stripBlockquotes(section.body);
      const transitionRawText = transitionBody.trim() || undefined;
      const transitionSeconds = estimateSegmentSeconds(
        'transition',
        [],
        transitionRawText,
      );
      segments.push({
        duration: formatSegmentDuration(transitionSeconds),
        label: section.heading,
        number: segNum++,
        points: [],
        rawText: transitionRawText,
        time: formatSegmentTime(currentSeconds),
        type: 'transition',
      });
      currentSeconds += transitionSeconds;
      continue;
    }

    if (!shouldIncludeSectionInRundown(section.heading)) continue;

    const points = parseTalkingPoints(section.body);
    const rawText = points.length === 0 ? section.body.trim() : undefined;
    const shortLabel = section.heading
      .replace(/^Talking Points?\s*—?\s*/i, '')
      .replace(/^—\s*/, '');
    const segmentSeconds = estimateSegmentSeconds('segment', points, rawText);

    segments.push({
      duration: formatSegmentDuration(segmentSeconds),
      label: shortLabel || section.heading,
      number: segNum++,
      points,
      rawText,
      time: formatSegmentTime(currentSeconds),
      type: 'segment',
    });
    currentSeconds += segmentSeconds;
  }

  if (hotTake) {
    const hotTakeSeconds = estimateSegmentSeconds('hottake', [], hotTake.body);
    segments.push({
      duration: formatSegmentDuration(hotTakeSeconds),
      label: 'Hot Take',
      number: segNum++,
      points: [],
      rawText: hotTake.body,
      time: formatSegmentTime(currentSeconds),
      type: 'hottake',
    });
    currentSeconds += hotTakeSeconds;
  }

  const conclusionPoints = [
    { sources: [], text: 'Recap the key takeaways' },
    { sources: [], text: 'What does this mean for indie devs this week?' },
    { sources: [], text: 'Shoutouts, like & subscribe, next stream teaser' },
    { sources: [], text: 'Open floor for chat questions' },
  ];
  const conclusionSeconds = estimateSegmentSeconds(
    'conclusion',
    conclusionPoints,
  );
  segments.push({
    duration: formatSegmentDuration(conclusionSeconds),
    label: 'Wrap Up & Chat Q&A',
    number: segNum++,
    points: conclusionPoints,
    time: formatSegmentTime(currentSeconds),
    type: 'conclusion',
  });

  return segments;
}

interface RichTextBlock {
  type: 'code' | 'heading' | 'paragraph';
  value: string;
}

function parseRichTextBlocks(rawText: string): RichTextBlock[] {
  const blocks: RichTextBlock[] = [];
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .filter((line) => !/^-{3,}\s*$/.test(line.trim()))
    .join('\n');
  const parts = cleaned.split(/(```[\s\S]*?```)/g).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
      blocks.push({ type: 'code', value: code.trimEnd() });
      continue;
    }

    const textBlocks = part
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    for (const textBlock of textBlocks) {
      if (textBlock.startsWith('### ')) {
        blocks.push({ type: 'heading', value: textBlock.slice(4).trim() });
      } else {
        blocks.push({ type: 'paragraph', value: textBlock });
      }
    }
  }

  return blocks;
}

function getBadgeForUrl(url: string): { badge: string; cls: string } {
  if (url.includes('news.ycombinator'))
    return { badge: 'HN', cls: SOURCE_COLORS.HN };
  if (url.includes('github.com'))
    return { badge: 'GH', cls: SOURCE_COLORS.GitHub };
  if (url.includes('techcrunch'))
    return { badge: 'TC', cls: 'bg-green-500/20 text-green-400' };
  if (url.includes('venturebeat'))
    return { badge: 'VB', cls: 'bg-purple-500/20 text-purple-400' };
  if (url.includes('theregister'))
    return { badge: 'REG', cls: 'bg-blue-500/20 text-blue-400' };
  if (url.includes('medium.com'))
    return { badge: 'MED', cls: 'bg-emerald-500/20 text-emerald-400' };
  if (url.includes('cnbc.com'))
    return { badge: 'CNBC', cls: 'bg-blue-500/20 text-blue-400' };
  if (url.includes('axios.com'))
    return { badge: 'AX', cls: 'bg-blue-400/20 text-blue-300' };
  if (url.includes('dev.to'))
    return { badge: 'DEV', cls: 'bg-indigo-500/20 text-indigo-400' };
  if (url.includes('reddit.com'))
    return { badge: 'RED', cls: SOURCE_COLORS.Reddit };
  if (url.includes('youtube.com'))
    return { badge: 'YT', cls: SOURCE_COLORS.YouTube };
  if (url.includes('twitter.com') || url.includes('x.com'))
    return { badge: 'X', cls: SOURCE_COLORS.X };
  try {
    const host =
      new URL(url).hostname
        .split('.')
        .slice(-2, -1)[0]
        ?.toUpperCase()
        .slice(0, 4) || 'WEB';
    return { badge: host, cls: 'bg-surface-border text-text-muted' };
  } catch {
    return { badge: 'WEB', cls: 'bg-surface-border text-text-muted' };
  }
}

const SEGMENT_COLORS: Record<
  string,
  { time: string; dot: string; line: string }
> = {
  conclusion: {
    dot: 'bg-green-400',
    line: 'bg-green-400/20',
    time: 'text-green-400',
  },
  hottake: {
    dot: 'bg-yellow-400',
    line: 'bg-yellow-400/20',
    time: 'text-yellow-400',
  },
  intro: { dot: 'bg-blue-400', line: 'bg-blue-400/20', time: 'text-blue-400' },
  segment: {
    dot: 'bg-accent-red',
    line: 'bg-accent-red/20',
    time: 'text-accent-red',
  },
  transition: {
    dot: 'bg-purple-400',
    line: 'bg-purple-400/20',
    time: 'text-purple-400',
  },
};

interface SegmentMediaItem {
  type: 'tweet' | 'youtube' | 'link';
  id: string;
  url: string;
  label: string;
}

function extractSegmentMedia(segment: ShowSegment): SegmentMediaItem[] {
  const items: SegmentMediaItem[] = [];
  const seen = new Set<string>();

  const processUrl = (url: string, label: string) => {
    if (seen.has(url) || isRestreamUrl(url)) return;
    seen.add(url);

    const tweetMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    if (tweetMatch) {
      items.push({ id: tweetMatch[1], label, type: 'tweet', url });
      return;
    }

    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    );
    if (ytMatch) {
      items.push({ id: ytMatch[1], label, type: 'youtube', url });
      return;
    }

    items.push({ id: url, label, type: 'link', url });
  };

  for (const point of segment.points) {
    const urls = Array.from(point.text.matchAll(/https?:\/\/[^\s)<>]+/g)).map(
      (m) => m[0],
    );
    const label = point.text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    for (const url of urls) processUrl(url, label);
    for (const source of point.sources) processUrl(source.url, source.text);
  }

  if (segment.rawText) {
    const urls = Array.from(
      segment.rawText.matchAll(/https?:\/\/[^\s)<>]+/g),
    ).map((m) => m[0]);
    for (const url of urls) processUrl(url, '');
  }

  return items;
}

export function TopicDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const date = searchParams.get('date') || todayLocalDate();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedDate, setResolvedDate] = useState(date);
  const [streamMeta, setStreamMeta] = useState<LivestreamMeta | null>(null);
  const [xReactions, setXReactions] = useState<TrendItem[]>([]);
  const [activeSegmentNumber, setActiveSegmentNumber] = useState(0);
  const rundownScrollRef = useRef<HTMLElement | null>(null);
  const segmentRefs = useRef(new Map<number, HTMLDivElement>());

  const fetchTopics = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const res = await fetch(`/api/livestreams?date=${date}`);
      const data = await parseJsonResponse<
        LivestreamListResponse | { error: string }
      >(res);
      if (!res.ok) {
        throw new Error(
          isErrorResponse(data) ? data.error : `API error ${res.status}`,
        );
      }
      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }
      const livestreamData = data as LivestreamListResponse;
      setTopics(livestreamData.topics);
      setResolvedDate(livestreamData.resolvedDate);
      logClientPerf('livestream_topic_fetch_topics', {
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        requestedDate: date,
        resolvedDate: livestreamData.resolvedDate,
        slug,
        topicCount: livestreamData.topics.length,
      });
    } finally {
      setLoading(false);
    }
  }, [date, slug]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const fetchStreamMeta = useCallback(async () => {
    const startedAt = performance.now();
    const res = await fetch(`/api/livestreams/${slug}/youtube?date=${date}`);
    const data = await parseJsonResponse<LivestreamMeta>(res);
    setStreamMeta(data);
    logClientPerf('livestream_topic_fetch_stream_meta', {
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      liveStatus: data.liveStatus,
      requestedDate: date,
      slug,
    });
  }, [date, slug]);

  useEffect(() => {
    fetchStreamMeta();
    const interval = setInterval(fetchStreamMeta, 30000);
    return () => clearInterval(interval);
  }, [fetchStreamMeta]);

  useEffect(() => {
    logClientEvent('livestream_topic_view', { requestedDate: date, slug });
  }, [slug, date]);

  const topic = topics.find((t) => t.slug === slug);
  const effectiveStatus = topic ? getEffectiveTopicStatus(topic) : null;
  const sections = parseMarkdownSections(topic?.content ?? '');
  const sourceBadges = topic?.source.split(',').map((s) => s.trim()) ?? [];
  const summarySection = sections.find((s) => s.heading === 'Summary');
  const hotTakeSection = sections.find((s) => s.heading === 'Hot Take');
  const livestreamNotesSection = sections.find(
    (s) => s.heading === 'Livestream Notes',
  );
  const livestreamNoteLinks = extractMarkdownLinks(
    livestreamNotesSection?.body ?? '',
  );
  const announcementTweetLink = topic?.announcement_tweet
    ? {
        text: 'Announcement Tweet',
        url: topic.announcement_tweet,
      }
    : null;
  const restreamLink =
    livestreamNoteLinks.find((link) => isRestreamUrl(link.url)) ?? null;
  const segments = buildShowRundown(sections);
  const activeSegment =
    segments.find((seg) => seg.number === activeSegmentNumber) || segments[0];
  const activeSegmentMedia = activeSegment
    ? extractSegmentMedia(activeSegment)
    : [];
  const keyFacts = segments
    .filter((seg) => seg.type === 'segment')
    .flatMap((seg) => seg.points.slice(0, 2))
    .map((point) => clampText(stripMarkdown(point.text), 170))
    .slice(0, 6);
  const cohostCues = [
    hotTakeSection
      ? `Push on the main angle: ${clampText(stripMarkdown(hotTakeSection.body), 140)}`
      : 'Push on the strongest claim and ask if the backlash is actually deserved.',
    segments[1]
      ? `Jump in on "${segments[1].label}" and ask whether this was a one-off mistake or a deeper platform problem.`
      : 'Ask whether this changes how devs should trust the platform.',
    segments[2]
      ? `Use "${segments[2].label}" to bring the conversation back to how this affects real users this week.`
      : 'Ask what this means for indie devs using the product right now.',
    'If chat disagrees, ask what Anthropic should have done instead.',
  ];
  const keyLinks = (() => {
    const links: MarkdownLink[] = [];

    if (streamMeta?.youtubeUrl) {
      links.push({
        text: streamMeta.liveStatus === 'live' ? 'Livestream' : 'Replay',
        url: streamMeta.youtubeUrl,
      });
    }

    if (announcementTweetLink) {
      links.push(announcementTweetLink);
    }

    for (const link of livestreamNoteLinks) {
      links.push(link);
    }

    for (const segment of segments.filter((seg) => seg.type === 'segment')) {
      const firstSource = segment.points
        .flatMap((point) => point.sources)
        .at(0);
      if (firstSource) {
        links.push({
          text: `${segment.label} — ${stripSourcePrefix(firstSource.text)}`,
          url: firstSource.url,
        });
      }
    }

    const deduped = new Map<string, MarkdownLink>();
    for (const link of links) {
      if (!deduped.has(link.url)) deduped.set(link.url, link);
    }
    return Array.from(deduped.values()).slice(0, 7);
  })();
  const topicSearchQuery = topic
    ? buildTopicSearchQuery(topic.title, summarySection?.body)
    : '';

  const fetchXReactions = useCallback(async () => {
    if (!topicSearchQuery) {
      setXReactions([]);
      return;
    }

    const startedAt = performance.now();
    try {
      const res = await fetch(
        `/api/trends/search?q=${encodeURIComponent(topicSearchQuery)}`,
      );
      const searchData = await parseJsonResponse<TrendsSearchResponse>(res);
      const tweets = searchData.items
        .filter((item) => item.source === 'x' && isTweetUrl(item.url))
        .slice(0, 6);
      setXReactions(tweets);
      logClientPerf('livestream_topic_fetch_x_reactions', {
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        query: topicSearchQuery,
        resultCount: tweets.length,
        slug,
      });
    } catch {
      setXReactions([]);
    }
  }, [slug, topicSearchQuery]);

  useEffect(() => {
    fetchXReactions();
  }, [fetchXReactions]);

  function jumpToSegment(segmentNumber: number) {
    setActiveSegmentNumber(segmentNumber);
    const element = segmentRefs.current.get(segmentNumber);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  useEffect(() => {
    const node = rundownScrollRef.current;
    if (!node || segments.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        const segmentNumber = top?.target.getAttribute('data-segment-number');
        if (!segmentNumber) return;
        setActiveSegmentNumber(Number(segmentNumber));
      },
      {
        root: node,
        rootMargin: '-25% 0px -50% 0px',
        threshold: [0.2, 0.5, 0.8],
      },
    );

    for (const segment of segments) {
      const element = segmentRefs.current.get(segment.number);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [segments]);

  if (loading) {
    return <LivestreamTopicContentSkeleton />;
  }

  if (!topic) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-[960px] flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-text-primary">
          Topic not found
        </p>
        <p className="mt-2 text-sm text-text-muted">
          No topic with slug <code>{slug}</code> was found for {resolvedDate}.
        </p>
        <Link
          href="/analytics"
          className="mt-6 rounded-lg border border-surface-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent-red/40 hover:text-text-primary"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-65px)] w-full max-w-[1800px] items-stretch gap-6 p-6">
      <main
        ref={rundownScrollRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-2"
      >
        <div className="sticky top-0 z-20 rounded-xl border border-surface-border bg-surface-card/95 p-5 backdrop-blur supports-[backdrop-filter]:bg-surface-card/85">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-widest">
            <Link
              href={`/livestreams/${encodeURIComponent(date)}`}
              className="text-text-muted transition-colors hover:text-text-primary"
            >
              Livestreams
            </Link>
            <span className="text-text-muted/50">/</span>
            <span className="text-accent-red">{resolvedDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sourceBadges.map((source) => (
              <span
                key={source}
                className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  SOURCE_COLORS[source] ||
                  'bg-surface-border text-text-secondary'
                }`}
              >
                {source}
              </span>
            ))}
            <span
              className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BADGES[effectiveStatus ?? topic.status]}`}
            >
              {(effectiveStatus ?? topic.status).replace('_', ' ')}
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary">
            {topic.title}
          </h1>
        </div>

        <section className="rounded-xl border border-surface-border bg-surface-card px-6">
          {segments.map((seg) => (
            <div
              key={seg.number}
              ref={(element) => {
                if (element) {
                  segmentRefs.current.set(seg.number, element);
                } else {
                  segmentRefs.current.delete(seg.number);
                }
              }}
              data-segment-number={seg.number}
              className="border-t border-surface-border/70 py-5 first:border-t-0"
            >
              <div className="sticky top-0 z-10 -mx-6 mb-4 flex items-center gap-3 border-b border-surface-border bg-surface-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-surface-card/85">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${SEGMENT_COLORS[seg.type].dot}`}
                />
                <span
                  className={`text-[11px] font-mono font-bold uppercase tracking-[0.2em] ${SEGMENT_COLORS[seg.type].time}`}
                >
                  {seg.time}
                </span>
                <span className="text-sm font-medium text-text-primary">
                  {seg.label}
                </span>
                <span className="text-xs text-text-muted">{seg.duration}</span>
              </div>

              {seg.rawText && (
                <div className="mb-4 space-y-4 border-l-2 border-yellow-500/40 bg-yellow-500/5 py-3 pl-4">
                  {parseRichTextBlocks(seg.rawText).map((block, blockIndex) => {
                    if (block.type === 'heading') {
                      return (
                        <h4
                          key={`${seg.number}-raw-${blockIndex}`}
                          className="text-lg font-semibold text-text-primary"
                        >
                          {renderInlineMarkdown(block.value)}
                        </h4>
                      );
                    }

                    if (block.type === 'code') {
                      return (
                        <div
                          key={`${seg.number}-raw-${blockIndex}`}
                          className="overflow-hidden rounded-xl border border-surface-border bg-surface"
                        >
                          <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted">
                              Prompt
                            </span>
                            <CopyButton text={block.value} />
                          </div>
                          <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-text-primary">
                            <code>{block.value}</code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <p
                        key={`${seg.number}-raw-${blockIndex}`}
                        className="text-[20px] leading-[1.7] text-text-primary"
                      >
                        {renderInlineMarkdown(block.value)}
                      </p>
                    );
                  })}
                </div>
              )}

              <div className="space-y-4">
                {seg.points.map((point, pointIndex) => (
                  <div
                    key={`${seg.number}-${pointIndex}`}
                    className="flex gap-4"
                  >
                    <div className="mt-1 flex flex-col items-center">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${SEGMENT_COLORS[seg.type].dot}`}
                      />
                      {pointIndex !== seg.points.length - 1 ? (
                        <span
                          className={`mt-2 w-px flex-1 ${SEGMENT_COLORS[seg.type].line}`}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[20px] font-medium leading-[1.7] text-text-primary">
                        {renderInlineMarkdown(point.text)}
                      </p>

                      {point.sources.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            ...point.sources.filter((s) => isTweetUrl(s.url)),
                            ...point.sources.filter((s) => !isTweetUrl(s.url)),
                          ].map((source, sourceIndex) => {
                            const { badge, cls } = getBadgeForUrl(source.url);
                            return (
                              <a
                                key={`${source.url}-${sourceIndex}`}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-red/30 hover:text-text-primary"
                              >
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${cls}`}
                                >
                                  {badge}
                                </span>
                                <span className="truncate">
                                  {stripSourcePrefix(source.text)}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      <aside className="min-h-0 w-full max-w-[360px] shrink-0 overflow-y-auto">
        <div className="space-y-4">
          {activeSegmentMedia.length > 0 && (
            <div className="sticky top-0 z-10 overflow-hidden rounded-xl border border-accent-red/20 bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/85">
              <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
                <span
                  className={`size-2 rounded-full ${SEGMENT_COLORS[activeSegment?.type || 'segment'].dot}`}
                />
                <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Sources — {activeSegment?.label}
                </h3>
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
                {activeSegmentMedia
                  .filter((m) => m.type === 'youtube')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-lg border border-surface-border"
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${item.id}`}
                        title={item.label || 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                      {item.label && (
                        <p className="truncate px-3 py-2 text-xs text-text-secondary">
                          {item.label}
                        </p>
                      )}
                    </div>
                  ))}
                {activeSegmentMedia
                  .filter((m) => m.type === 'tweet')
                  .map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-surface-border p-3 transition-colors hover:border-blue-400/30 hover:bg-blue-400/5"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="rounded bg-blue-400/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-400">
                          X
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-text-primary">
                        {item.label}
                      </p>
                    </a>
                  ))}
                {activeSegmentMedia
                  .filter((m) => m.type === 'link')
                  .map((item) => {
                    const { badge, cls } = getBadgeForUrl(item.url);
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-accent-red/30 hover:text-text-primary"
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${cls}`}
                        >
                          {badge}
                        </span>
                        <span className="truncate">
                          {item.label || item.url}
                        </span>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Stream Snapshot
              </h3>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-2">
                {streamMeta?.youtubeUrl && (
                  <a
                    href={streamMeta.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-red/30 hover:text-accent-red"
                  >
                    <span>
                      {streamMeta.liveStatus === 'live'
                        ? 'Open Livestream'
                        : 'Open Replay'}
                    </span>
                  </a>
                )}

                {restreamLink && (
                  <a
                    href={restreamLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-red/30 hover:text-accent-red"
                  >
                    <span>Open Restream Studio</span>
                  </a>
                )}

                {announcementTweetLink && (
                  <a
                    href={announcementTweetLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-red/30 hover:text-accent-red"
                  >
                    <span>Open Announcement Tweet</span>
                  </a>
                )}

                <Link
                  href={`/livestreams/${slug}/draw?date=${date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-elevated/50 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-red/30 hover:text-accent-red"
                >
                  <span>Open Drawing Board</span>
                </Link>
              </div>

              {streamMeta?.thumbnailUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-surface-border">
                  <Image
                    src={streamMeta.thumbnailUrl}
                    alt={streamMeta.title || topic.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="object-cover"
                  />
                </div>
              )}

              {(streamMeta?.title ||
                streamMeta?.channelTitle ||
                summarySection?.body) && (
                <div>
                  {streamMeta?.title && (
                    <p className="text-sm font-semibold leading-snug text-text-primary">
                      {streamMeta.title}
                    </p>
                  )}
                  {streamMeta?.channelTitle && (
                    <p className="mt-1 text-xs text-text-muted">
                      {streamMeta.channelTitle}
                    </p>
                  )}
                  {summarySection?.body && (
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      {clampText(stripMarkdown(summarySection.body), 220)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">Status</span>
                  <span
                    className={`rounded px-2 py-1 text-[11px] font-medium uppercase ${
                      streamMeta?.liveStatus === 'live'
                        ? 'bg-red-500/10 text-red-400'
                        : streamMeta?.liveStatus === 'ended'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-surface-border text-text-secondary'
                    }`}
                  >
                    {streamMeta?.liveStatus || 'missing'}
                  </span>
                </div>

                {streamMeta?.youtubeUrl && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">YouTube</span>
                    <a
                      href={streamMeta.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[220px] truncate text-right text-xs text-accent-red hover:underline"
                    >
                      {streamMeta.liveStatus === 'live'
                        ? 'Open stream'
                        : 'Open replay'}
                    </a>
                  </div>
                )}

                {streamMeta?.viewCount !== undefined && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">Views</span>
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCompactNumber(streamMeta.viewCount)}
                    </span>
                  </div>
                )}

                {streamMeta?.liveStatus === 'live' && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">
                      Current viewers
                    </span>
                    <span className="text-sm font-semibold text-red-400">
                      {formatCompactNumber(streamMeta.concurrentViewers)}
                    </span>
                  </div>
                )}

                {streamMeta?.actualStartTime && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">Started</span>
                    <span className="text-xs text-text-secondary">
                      {new Date(streamMeta.actualStartTime).toLocaleString()}
                    </span>
                  </div>
                )}

                {streamMeta?.actualEndTime && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">Ended</span>
                    <span className="text-xs text-text-secondary">
                      {new Date(streamMeta.actualEndTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Co-Host Cues
              </h3>
            </div>
            <div className="space-y-3 p-4">
              {cohostCues.map((cue) => (
                <div key={cue} className="flex gap-3">
                  <span className="mt-0.5 text-[11px] font-mono font-bold text-accent-red">
                    Q
                  </span>
                  <p className="text-sm leading-relaxed text-text-primary">
                    {cue}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Episode Brief
              </h3>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-text-muted">
                  What Happened
                </p>
                <p className="text-sm leading-relaxed text-text-primary">
                  {summarySection
                    ? stripMarkdown(summarySection.body)
                    : 'No summary provided yet.'}
                </p>
              </div>
              {hotTakeSection && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-yellow-300/80">
                    What Side To Take
                  </p>
                  <p className="text-sm leading-relaxed text-text-primary">
                    {stripMarkdown(hotTakeSection.body)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Segment Timeline
              </h3>
            </div>
            <div className="space-y-2 p-4">
              {segments.map((seg) => (
                <button
                  key={seg.number}
                  type="button"
                  onClick={() => jumpToSegment(seg.number)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeSegmentNumber === seg.number
                      ? 'border-accent-red/30 bg-accent-red/5'
                      : 'border-surface-border/70 bg-surface-elevated/30 hover:border-accent-red/20 hover:bg-surface-elevated/50'
                  }`}
                >
                  <span
                    className={`mt-0.5 text-[11px] font-mono font-bold ${SEGMENT_COLORS[seg.type].time}`}
                  >
                    {seg.time}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-text-primary">
                      {seg.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {seg.duration}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Must-Hit Facts
              </h3>
            </div>
            <div className="space-y-3 p-4">
              {keyFacts.map((fact, index) => (
                <div key={`${index}-${fact}`} className="flex gap-3">
                  <span className="mt-0.5 text-[11px] font-mono font-bold text-text-muted">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-text-primary">
                    {fact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Key Links
              </h3>
            </div>
            <div className="space-y-2 p-4">
              {keyLinks.map((link, index) => {
                const { badge, cls } = getBadgeForUrl(link.url);
                return (
                  <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-accent-red/30 hover:text-text-primary"
                  >
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${cls}`}
                    >
                      {index === 0 && streamMeta?.youtubeUrl === link.url
                        ? 'LIVE'
                        : badge}
                    </span>
                    <span className="truncate">
                      {stripSourcePrefix(link.text)}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="border-b border-surface-border px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                X Reactions
              </h3>
            </div>
            <div className="max-h-[40vh] space-y-2 overflow-y-auto p-4">
              {xReactions.length > 0 ? (
                xReactions.map((tweet) => (
                  <a
                    key={tweet.id}
                    href={tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-surface-border p-3 transition-colors hover:border-accent-red/30"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span className="rounded bg-blue-400/20 px-1.5 py-0.5 font-mono font-bold text-blue-400">
                        X
                      </span>
                      {tweet.author ? (
                        <span className="truncate text-text-secondary">
                          {tweet.author}
                        </span>
                      ) : null}
                      <span className="ml-auto font-mono">
                        {formatCompactNumber(tweet.score)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-primary">
                      {clampText(tweet.title, 180)}
                    </p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-text-muted">
                  No matching tweets surfaced for this topic yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            rundownScrollRef.current?.scrollTo({
              behavior: 'smooth',
              top: 0,
            })
          }
          className="flex size-10 items-center justify-center rounded-full border border-surface-border bg-surface-card/95 text-text-secondary shadow-lg backdrop-blur transition-colors hover:border-accent-red/40 hover:text-text-primary"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12V4M4 7l4-4 4 4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() =>
            rundownScrollRef.current?.scrollTo({
              behavior: 'smooth',
              top: rundownScrollRef.current.scrollHeight,
            })
          }
          className="flex size-10 items-center justify-center rounded-full border border-surface-border bg-surface-card/95 text-text-secondary shadow-lg backdrop-blur transition-colors hover:border-accent-red/40 hover:text-text-primary"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 4v8M4 9l4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
