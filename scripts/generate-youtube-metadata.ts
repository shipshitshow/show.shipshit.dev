#!/usr/bin/env bun
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

type VideoType = 'livestream' | 'video' | 'short';

interface Inventory {
  channel: string;
  fetchedAt: string;
  items: InventoryItem[];
}

interface InventoryItem {
  actualEndTime?: string | null;
  actualStartTime?: string | null;
  cleanTranscriptPath?: string;
  commentCount?: number;
  description?: string;
  duration_seconds_flat?: number;
  duration_string_flat?: string;
  id: string;
  likeCount?: number;
  publishedAt?: string;
  rawTranscriptPath?: string;
  thumbnail?: string;
  title: string;
  transcriptStatus?: string;
  type?: VideoType;
  url?: string;
  viewCount?: number;
}

interface CliArgs {
  force: boolean;
  help: boolean;
  id?: string;
  latest: boolean;
  mode?: VideoType;
  out?: string;
  query?: string;
  stdout: boolean;
  title?: string;
  topic?: string;
  transcript?: string;
}

interface Cue {
  start: number;
  text: string;
}

interface Chapter {
  source: 'description' | 'topic' | 'vtt';
  start: number;
  title: string;
}

const ROOT = process.cwd();
const INVENTORY_PATH = join(
  ROOT,
  'apps/app/data/youtube/channel-inventory.json',
);
const DEFAULT_OUT_DIR = join(ROOT, 'apps/app/data/youtube');
const STOPWORDS = new Set([
  'a',
  'about',
  'actually',
  'again',
  'all',
  'already',
  'also',
  'an',
  'and',
  'are',
  'because',
  'been',
  'being',
  'but',
  'can',
  'could',
  'did',
  'does',
  'doing',
  'for',
  'from',
  'get',
  'going',
  'gonna',
  'got',
  'had',
  'has',
  'have',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  "it's",
  'just',
  'like',
  'look',
  'make',
  'now',
  'of',
  'okay',
  'on',
  'or',
  'our',
  'really',
  'right',
  'so',
  'that',
  "that's",
  'the',
  'then',
  'there',
  'this',
  'to',
  'up',
  'us',
  'we',
  'what',
  'when',
  'where',
  'why',
  'with',
  'would',
  'uh',
  'um',
  'yeah',
  'yes',
  'you',
  'your',
]);

const GENERIC_CHAPTER_WORDS = new Set([
  'bam',
  'blah',
  'challenge',
  'chapter',
  'cool',
  'conclusion',
  'different',
  'differently',
  'discussion',
  'end',
  'ever',
  'final',
  'intro',
  'introduction',
  'mhm',
  'nice',
  'outro',
  'overview',
  'part',
  'section',
  'timestamp',
  'timestamps',
]);

function usage(): string {
  return [
    'Usage:',
    '  bun scripts/generate-youtube-metadata.ts [video-id|title-query]',
    '  bun scripts/generate-youtube-metadata.ts --latest',
    '  bun scripts/generate-youtube-metadata.ts --topic apps/app/data/livestream/YYYY-MM-DD/topic.md',
    '  bun scripts/generate-youtube-metadata.ts --transcript apps/app/data/transcripts/video.en.vtt --title "Video title"',
    '',
    'Options:',
    '  --id <id>            Resolve a video by YouTube id.',
    '  --latest             Use the newest item in channel-inventory.json.',
    '  --topic <path>       Include a livestream topic markdown file.',
    '  --transcript <path>  Include a raw VTT or clean transcript file.',
    '  --title <title>      Title for transcript-only mode.',
    '  --mode <type>        video, livestream, or short.',
    '  --out <path>         Write to a specific markdown file.',
    '  --stdout             Print markdown instead of writing a file.',
    '  --force              Overwrite --out when it exists.',
  ].join('\n');
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    force: false,
    help: false,
    latest: false,
    stdout: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [flag, inlineValue] = raw.split(/=(.*)/s, 2);
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      i += 1;
      const value = argv[i];
      if (!value) throw new Error(`Missing value for ${raw}`);
      return value;
    };

    switch (flag) {
      case '--force':
        args.force = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--id':
        args.id = readValue();
        break;
      case '--latest':
        args.latest = true;
        break;
      case '--mode': {
        const value = readValue();
        if (!['livestream', 'short', 'video'].includes(value)) {
          throw new Error(`Invalid --mode: ${value}`);
        }
        args.mode = value as VideoType;
        break;
      }
      case '--out':
        args.out = readValue();
        break;
      case '--stdout':
        args.stdout = true;
        break;
      case '--title':
        args.title = readValue();
        break;
      case '--topic':
        args.topic = readValue();
        break;
      case '--transcript':
        args.transcript = readValue();
        break;
      default:
        if (raw.startsWith('-')) throw new Error(`Unknown option: ${raw}`);
        if (args.query) {
          args.query = `${args.query} ${raw}`;
        } else {
          args.query = raw;
        }
    }
  }

  if (!args.query && !args.id && !args.topic && !args.transcript) {
    args.latest = true;
  }

  return args;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function readOptional(path?: string): string {
  if (!path) return '';
  const absolute = toAbsolute(path);
  if (!existsSync(absolute)) return '';
  return readText(absolute);
}

function toAbsolute(path: string): string {
  return path.startsWith('/') ? path : join(ROOT, path);
}

function loadInventory(): Inventory {
  if (!existsSync(INVENTORY_PATH)) {
    throw new Error(`Missing inventory: ${INVENTORY_PATH}`);
  }
  return JSON.parse(readText(INVENTORY_PATH)) as Inventory;
}

function videoTime(item: InventoryItem): number {
  const value = item.actualStartTime || item.publishedAt || '';
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function idFromUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.searchParams.get('v') || undefined;
  } catch {
    return undefined;
  }
}

function resolveVideo(
  args: CliArgs,
  inventory: Inventory,
): InventoryItem | undefined {
  const query =
    args.id || (args.query ? idFromUrl(args.query) || args.query : '');
  if (!query && args.latest) {
    return [...inventory.items].sort((a, b) => videoTime(b) - videoTime(a))[0];
  }
  if (!query) return undefined;

  const normalized = normalizeQuery(query);
  return inventory.items.find((item) => {
    return (
      item.id === query ||
      normalizeQuery(item.id) === normalized ||
      normalizeQuery(item.title).includes(normalized) ||
      normalizeQuery(item.url || '').includes(normalized)
    );
  });
}

function decodeHtml(value: string): string {
  return value
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanCaption(value: string): string {
  return decodeHtml(value)
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTimecode(value: string): number {
  const parts = value.split(':');
  const seconds = Number(parts.at(-1));
  const minutes = Number(parts.at(-2) || 0);
  const hours = Number(parts.at(-3) || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function parseVttCues(vtt: string): Cue[] {
  const cues: Cue[] = [];
  const lines = vtt.split(/\r?\n/);
  let currentStart: number | undefined;
  let textLines: string[] = [];
  let previousClean = '';

  const flush = () => {
    if (currentStart === undefined) return;
    const clean = cleanCaption(textLines.join(' '));
    textLines = [];
    if (!clean) return;

    const text = removeOverlappingCaption(previousClean, clean);

    if (!text) {
      previousClean = clean;
      return;
    }
    cues.push({ start: currentStart, text });
    previousClean = clean;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const timing = line.match(
      /^((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/,
    );
    if (timing) {
      flush();
      currentStart = parseTimecode(timing[1]);
      continue;
    }
    if (
      !line ||
      line === 'WEBVTT' ||
      line.startsWith('Kind:') ||
      line.startsWith('Language:') ||
      /^\d+$/.test(line)
    ) {
      continue;
    }
    if (currentStart !== undefined) textLines.push(line);
  }
  flush();

  return cues;
}

function normalizeOverlapWord(value: string): string {
  return cleanWord(value).toLowerCase();
}

function removeOverlappingCaption(previous: string, current: string): string {
  if (!previous) return current;
  const previousWords = previous.split(/\s+/).filter(Boolean);
  const currentWords = current.split(/\s+/).filter(Boolean);
  const maxOverlap = Math.min(previousWords.length, currentWords.length, 40);

  for (let count = maxOverlap; count > 0; count -= 1) {
    const previousTail = previousWords
      .slice(-count)
      .map(normalizeOverlapWord)
      .join(' ');
    const currentHead = currentWords
      .slice(0, count)
      .map(normalizeOverlapWord)
      .join(' ');

    if (previousTail && previousTail === currentHead) {
      return currentWords.slice(count).join(' ').trim();
    }
  }

  return current;
}

function cleanWord(value: string): string {
  return value.replace(/^[^A-Za-z0-9#]+|[^A-Za-z0-9.#+-]+$/g, '');
}

function titleCaseWord(value: string): string {
  if (/^[A-Z0-9.#+-]{2,}$/.test(value)) return value;
  if (
    /^(AI|API|CAD|CEO|CLI|CTO|FPS|GPT|IDE|LLM|MCP|NPM|PR|QA|RL|SWE|UI|UX)$/i.test(
      value,
    )
  ) {
    return value.toUpperCase();
  }
  if (/^\d+(?:\.\d+)?$/.test(value)) return value;
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function chapterTitleFromText(value: string, fallback: string): string {
  const source = decodeHtml(value);
  const normalized = source
    .replace(/\([^)]*\)/g, ' ')
    .replace(/["'`]/g, ' ')
    .replace(/[|/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (/cold open/i.test(source)) return 'Cold Open';
  if (wordCount <= 18 && /outro|subscribe|get the game|get it/i.test(source)) {
    return 'Outro';
  }
  if (/best model/i.test(source)) return 'Opus 4.8 Test';
  if (/duke/i.test(source)) return 'Duke Nukem';
  if (/building the finale/i.test(source)) return 'Final Build';
  if (/playthrough/i.test(source)) return 'Final Run';
  if (/verdict/i.test(source)) return 'Final Verdict';
  if (/weapons?|upgrades?/i.test(source)) return 'Weapon Upgrades';
  if (/final/i.test(source)) return 'Final Run';
  if (wordCount <= 18) {
    if (/boss/i.test(normalized)) return 'Boss Fight';
    if (/first build|goes live|it runs/i.test(normalized)) return 'First Build';
    if (/cost|pricing|token|bill/i.test(normalized)) return 'Cost Reality';
  }

  const afterColon = normalized.includes(':')
    ? normalized.split(':').at(-1) || normalized
    : normalized;
  const rawWords = afterColon
    .split(/\s+/)
    .map(cleanWord)
    .filter(Boolean)
    .filter((word) => word.length > 2 || /^[A-Z0-9.#+-]{2,}$/i.test(word))
    .filter((word) => {
      const lower = word.toLowerCase();
      return !STOPWORDS.has(lower) && !GENERIC_CHAPTER_WORDS.has(lower);
    });

  const words =
    wordCount > 18 ? rankedWords(rawWords).slice(0, 3) : rawWords.slice(0, 3);
  const picked = words.map(titleCaseWord);
  if (picked.length > 0) return picked.join(' ');
  return fallback;
}

function rankedWords(words: string[]): string[] {
  const counts = new Map<string, { first: string; score: number }>();
  for (const word of words) {
    const lower = word.toLowerCase();
    const current = counts.get(lower) || { first: word, score: 0 };
    const namedBonus =
      /^(ai|asset|boss|build|claude|cli|code|deadrot|fable|game|github|image|menu|multiplayer|prompt|repo|sprite|studio|tower)$/i.test(
        word,
      )
        ? 2
        : 0;
    current.score += 1 + namedBonus;
    counts.set(lower, current);
  }

  return [...counts.values()]
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.first);
}

function extractDescriptionChapters(description: string): Chapter[] {
  const chapters: Chapter[] = [];
  const lines = description.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(
      /^\s*(?:[-*]\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2})\s*(?:[-:]\s*|\s+)(.+?)\s*$/,
    );
    if (!match) continue;
    const start = parseTimecode(match[1]);
    const title = chapterTitleFromText(
      match[2],
      start === 0 ? 'Cold Open' : 'Topic Turn',
    );
    chapters.push({ source: 'description', start, title });
  }

  if (chapters.length > 0 && chapters[0].start !== 0) {
    chapters.unshift({ source: 'description', start: 0, title: 'Cold Open' });
  }

  return dedupeChapters(chapters);
}

function dedupeChapters(chapters: Chapter[]): Chapter[] {
  const seen = new Set<string>();
  return chapters
    .sort((a, b) => a.start - b.start)
    .filter((chapter) => {
      const key = `${chapter.start}:${chapter.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function textWindow(cues: Cue[], start: number, seconds: number): string {
  return cues
    .filter((cue) => cue.start >= start && cue.start < start + seconds)
    .map((cue) => cue.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildVttChapters(
  cues: Cue[],
  duration: number,
  mode: VideoType,
): Chapter[] {
  if (cues.length === 0) return [];
  const inferredDuration =
    duration || Math.max(...cues.map((cue) => cue.start)) + 60;
  const target =
    mode === 'livestream'
      ? clamp(Math.round(inferredDuration / 360), 8, 18)
      : clamp(Math.round(inferredDuration / 100), 6, 12);
  const interval = Math.max(45, inferredDuration / target);
  const chapters: Chapter[] = [];

  for (let index = 0; index < target; index += 1) {
    const wanted = index === 0 ? 0 : index * interval;
    const cue =
      cues.find((candidate) => candidate.start >= wanted) ||
      cues[cues.length - 1];
    const start = index === 0 ? 0 : cue.start;
    const windowText = textWindow(
      cues,
      start,
      mode === 'livestream' ? 120 : 75,
    );
    chapters.push({
      source: 'vtt',
      start,
      title: chapterTitleFromText(
        windowText,
        index === 0 ? 'Cold Open' : 'Topic Turn',
      ),
    });
  }

  return dedupeChapters(chapters);
}

function nearestCueStart(cues: Cue[], wanted: number): number {
  if (cues.length === 0) return wanted;
  return cues.find((cue) => cue.start >= wanted)?.start || cues.at(-1)!.start;
}

function topicChapterTitle(heading: string): string | undefined {
  const normalized = heading.replace(/^Talking Points\s*[—-]\s*/i, '').trim();
  const lower = normalized.toLowerCase();

  if (lower.startsWith('livestream notes')) return undefined;
  if (lower === 'summary') return undefined;
  if (lower.startsWith('sources')) return undefined;
  if (lower.startsWith('tweets')) return undefined;
  if (lower.includes('copy paste')) return undefined;
  if (lower.includes('thumbnail')) return undefined;
  if (lower.includes('clip candidate')) return undefined;
  if (lower.startsWith('cold open')) return 'Cold Open';
  if (lower.startsWith('closing')) return 'Closing Take';
  if (lower.includes('steam')) return 'Steam Disclosure';
  if (lower.includes('deadrot')) return 'DEADROT Rules';
  if (lower.includes('persistent war')) return 'Persistent War';
  if (lower.includes('studio pipeline') || lower.includes('live build')) {
    return 'Studio Pipeline';
  }
  if (lower.includes('coding agent')) return 'Coding Agents';

  return chapterTitleFromText(normalized, 'Topic Turn');
}

function buildTopicChapters(
  topicText: string,
  cues: Cue[],
  duration: number,
): Chapter[] {
  if (!topicText) return [];
  const titles = topicText
    .split(/\r?\n/)
    .map((line) => line.match(/^##\s+(.+)$/)?.[1]?.trim())
    .filter((heading): heading is string => Boolean(heading))
    .map(topicChapterTitle)
    .filter((title): title is string => Boolean(title));

  const dedupedTitles = titles.filter((title, index) => {
    return titles.indexOf(title) === index;
  });

  if (dedupedTitles.length < 3) return [];
  const inferredDuration =
    duration ||
    (cues.length > 0 ? Math.max(...cues.map((cue) => cue.start)) + 60 : 0);
  const interval = inferredDuration
    ? inferredDuration / dedupedTitles.length
    : 300;

  return dedupedTitles.map((title, index) => {
    return {
      source: 'topic',
      start: index === 0 ? 0 : nearestCueStart(cues, index * interval),
      title,
    };
  });
}

function parseFrontmatter(text: string): Record<string, string> {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const body = text.slice(3, end).trim();
  const data: Record<string, string> = {};
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return data;
}

function walkMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walkMarkdownFiles(path);
    return path.endsWith('.md') ? [path] : [];
  });
}

function relativePath(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function findTopicForItem(item?: InventoryItem): string | undefined {
  if (!item) return undefined;
  const needles = [item.id, item.url].filter(Boolean) as string[];
  if (needles.length === 0) return undefined;

  for (const path of walkMarkdownFiles(
    join(ROOT, 'apps/app/data/livestream'),
  )) {
    const text = readText(path);
    if (needles.some((needle) => text.includes(needle))) return path;
  }

  return undefined;
}

function findItemForTopic(
  topicText: string,
  inventory: Inventory,
): InventoryItem | undefined {
  return inventory.items.find((item) => {
    return [item.id, item.url].filter(Boolean).some((needle) => {
      return topicText.includes(needle as string);
    });
  });
}

function excerpt(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trimEnd()}...`;
}

function excerptMarkdown(value: string, maxLength: number): string {
  const clean = value.replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trimEnd()}...`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'youtube-metadata'
  );
}

function dateStamp(item?: InventoryItem, topicText?: string): string {
  const frontmatter = topicText ? parseFrontmatter(topicText) : {};
  const value =
    item?.actualStartTime ||
    item?.publishedAt ||
    frontmatter.date ||
    new Date().toISOString();
  const date = new Date(value);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function uniqueOutPath(path: string): string {
  if (!existsSync(path)) return path;
  const extension = extname(path);
  const stem = path.slice(0, -extension.length);
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${stem}-${index}${extension}`;
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Unable to find available output path for ${path}`);
}

function topicTitle(topicText: string, topicPath?: string): string {
  const frontmatter = parseFrontmatter(topicText);
  if (frontmatter.title) return frontmatter.title;
  const heading = topicText.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return topicPath
    ? basename(topicPath, extname(topicPath))
    : 'Untitled YouTube Video';
}

function chapterLines(chapters: Chapter[]): string {
  return chapters
    .map((chapter) => `${formatTime(chapter.start)} ${chapter.title}`)
    .join('\n');
}

function chapterEvidence(cues: Cue[], chapters: Chapter[]): string {
  if (cues.length === 0 || chapters.length === 0) {
    return '- No VTT evidence available. Use clean transcript/topic notes for wording only.';
  }

  return chapters
    .map((chapter) => {
      const sample = excerpt(textWindow(cues, chapter.start, 75), 420);
      return `- ${formatTime(chapter.start)} ${chapter.title}: ${sample || 'No nearby text.'}`;
    })
    .join('\n');
}

function sourceBullet(label: string, value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `- ${label}: ${value}`;
}

function buildMarkdown(args: CliArgs): { markdown: string; outPath: string } {
  const inventory = loadInventory();
  let item = resolveVideo(args, inventory);
  let topicPath = args.topic ? toAbsolute(args.topic) : findTopicForItem(item);

  let topicText = topicPath ? readText(topicPath) : '';
  if (!item && topicText) {
    item = findItemForTopic(topicText, inventory);
  }
  if (!topicPath) {
    topicPath = findTopicForItem(item);
    topicText = topicPath ? readText(topicPath) : '';
  }

  const transcriptPath = args.transcript
    ? toAbsolute(args.transcript)
    : item?.rawTranscriptPath
      ? toAbsolute(item.rawTranscriptPath)
      : undefined;
  const cleanTranscriptPath = item?.cleanTranscriptPath
    ? toAbsolute(item.cleanTranscriptPath)
    : undefined;

  if (!item && !topicPath && !transcriptPath) {
    throw new Error('No video, topic, or transcript resolved.');
  }

  const rawTranscript = transcriptPath ? readOptional(transcriptPath) : '';
  const cleanTranscript = cleanTranscriptPath
    ? readOptional(cleanTranscriptPath)
    : transcriptPath && !transcriptPath.endsWith('.vtt')
      ? readOptional(transcriptPath)
      : '';
  const cues = transcriptPath?.endsWith('.vtt')
    ? parseVttCues(rawTranscript)
    : [];
  const mode = args.mode || item?.type || 'video';
  const title = args.title || item?.title || topicTitle(topicText, topicPath);
  const descriptionChapters = item?.description
    ? extractDescriptionChapters(item.description)
    : [];
  const topicChapters = buildTopicChapters(
    topicText,
    cues,
    item?.duration_seconds_flat || 0,
  );
  const chapters =
    descriptionChapters.length >= 3
      ? descriptionChapters
      : topicChapters.length >= 3
        ? topicChapters
        : buildVttChapters(cues, item?.duration_seconds_flat || 0, mode);
  const transcriptSample = excerpt(
    cleanTranscript || cues.map((cue) => cue.text).join(' '),
    1800,
  );
  const topicSample = excerptMarkdown(topicText, 2200);
  const sourceTitle = slugify(title);
  const defaultOut = join(
    DEFAULT_OUT_DIR,
    `${dateStamp(item, topicText)}-${sourceTitle}-metadata-orchestration.md`,
  );
  const outPath = args.out ? toAbsolute(args.out) : uniqueOutPath(defaultOut);
  const commandSource =
    item?.id ||
    (topicPath
      ? `--topic ${args.topic}`
      : transcriptPath
        ? `--transcript ${args.transcript}`
        : '');

  const sourceLines = [
    sourceBullet('Channel', inventory.channel),
    sourceBullet('Video ID', item?.id),
    sourceBullet('URL', item?.url),
    sourceBullet('Type', mode),
    sourceBullet('Published', item?.publishedAt),
    sourceBullet('Duration', item?.duration_string_flat),
    sourceBullet('Views', item?.viewCount),
    sourceBullet('Likes', item?.likeCount),
    sourceBullet('Comments', item?.commentCount),
    sourceBullet('Raw VTT', item?.rawTranscriptPath || args.transcript),
    sourceBullet('Clean transcript', item?.cleanTranscriptPath),
    sourceBullet(
      'Topic file',
      args.topic || (topicPath ? relativePath(topicPath) : undefined),
    ),
  ].filter(Boolean);

  const markdown = `# YouTube Metadata Orchestration - ${title}

Generated by \`bun scripts/generate-youtube-metadata.ts ${commandSource}\`.

## Source

${sourceLines.join('\n')}

## Quality Bar

- Use \`$metadata\` for title, description, and \`youtube_tags\`.
- Use \`$chapters\` for every chapter line.
- First chapter starts at \`0:00\`.
- Every chapter title is 3 words max.
- Open the description with the concrete hook, not channel housekeeping.
- Name the model, tool, company, repo, or game in the first paragraph.
- Keep claims grounded in the transcript, topic file, or existing description.
- Use short paragraphs and remove generic SEO filler.

## Draft Chapters

Source: ${
    descriptionChapters.length >= 3
      ? 'existing description'
      : topicChapters.length >= 3
        ? 'topic outline with VTT-backed approximate anchors'
        : cues.length > 0
          ? 'raw VTT draft'
          : 'missing timestamp source'
  }

\`\`\`text
${chapters.length > 0 ? chapterLines(chapters) : '0:00 Cold Open approx'}
\`\`\`

## Chapter Evidence

${chapterEvidence(cues, chapters)}

## Existing Description

\`\`\`text
${item?.description?.trim() || 'No existing description provided.'}
\`\`\`

## Topic Context

\`\`\`markdown
${topicSample || 'No topic file provided.'}
\`\`\`

## Transcript Sample

\`\`\`text
${transcriptSample || 'No transcript text available.'}
\`\`\`

## Production Prompt

Use \`$metadata\` and \`$chapters\`.

Create the final YouTube package for this video:

Title: ${title}
Type: ${mode}

Return exactly:

### Video Script

- A cold open that lands in the first 10 seconds.
- A tight edited-video structure with 4-7 beats.
- Host-ready phrasing, not a corporate outline.
- On-screen proof moments to show.
- One strong closing line.

### Recommended Title

- One title only.

### Title Candidates

- 8-12 candidates.

### Description Draft

- Full YouTube description.
- Include \`CHAPTERS:\` using the draft chapters as evidence.
- Rewrite chapter titles if needed, but keep every chapter title to 3 words max.
- Keep timestamps monotonic and start at \`0:00\`.

### Pinned Comment

- One comment that creates useful discussion.

### youtube_tags

- 15-25 phrase tags.

### Why This Should Work

- 3-5 bullets tied to the transcript, channel pattern, and viewer promise.

Non-negotiables:

- Do not invent facts, metrics, links, or timestamps.
- Do not use vague hype unless the transcript proves it.
- Do not call \`youtube_tags\` anything else.
- If a timestamp is uncertain, mark it \`approx\`.
`;

  return { markdown, outPath };
}

function main() {
  try {
    const args = parseArgs(Bun.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }

    const { markdown, outPath } = buildMarkdown(args);
    if (args.stdout) {
      console.log(markdown);
      return;
    }

    if (existsSync(outPath) && !args.force) {
      throw new Error(`Output exists. Use --force or --out: ${outPath}`);
    }
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, markdown, 'utf8');
    console.log(outPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    process.exit(1);
  }
}

main();
