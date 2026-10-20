export interface MarkdownSection {
  body: string;
  title: string;
}

export function parseSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const matches = Array.from(content.matchAll(/^## (.+)$/gm));

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const next = matches[i + 1];
    const title = match[1].trim();
    const body = content
      .slice((match.index ?? 0) + match[0].length, next?.index)
      .trim();

    if (body.length > 0) sections.push({ body, title });
  }

  return sections;
}

export function parseSubSections(body: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const matches = Array.from(body.matchAll(/^### (.+)$/gm));

  if (matches.length === 0) return [{ body, title: '' }];

  const preamble = body.slice(0, matches[0].index).trim();
  if (preamble) sections.push({ body: preamble, title: '' });

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const next = matches[i + 1];
    const title = match[1].trim();
    const sectionBody = body
      .slice((match.index ?? 0) + match[0].length, next?.index)
      .trim();
    if (sectionBody.length > 0) sections.push({ body: sectionBody, title });
  }

  return sections;
}

export function isUsefulSection(title: string): boolean {
  const normalized = title.toLowerCase();
  return (
    normalized === 'summary' ||
    normalized === 'hot take' ||
    normalized.startsWith('cold open') ||
    normalized.startsWith('talking points') ||
    normalized.startsWith('close') ||
    normalized.startsWith('closing') ||
    normalized.startsWith('tweets') ||
    normalized.startsWith('sources')
  );
}

export function extractTweetIds(body: string): string[] {
  const matches = body.matchAll(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

export function extractYouTubeVideoIds(body: string): string[] {
  const matches = body.matchAll(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g,
  );
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

export function stripEmbedUrls(body: string): string {
  return body
    .replace(/https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/g, '')
    .replace(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}[^\s)"]*/g,
      '',
    );
}

/** Sentence punctuation right after a bare URL belongs to the sentence. */
const TRAILING_URL_PUNCTUATION = /[.,;:!?'"]+$/;

function renderAutoLinkedText(text: string, keyPrefix: string) {
  const urlPattern = /(https?:\/\/[^\s),]+)/g;
  const segments = text.split(urlPattern);
  return segments.flatMap((seg, i) => {
    if (/^https?:\/\//.test(seg)) {
      const trailing = seg.match(TRAILING_URL_PUNCTUATION)?.[0] ?? '';
      const url = trailing ? seg.slice(0, -trailing.length) : seg;
      const display = url
        .replace(/^https?:\/\/(?:www\.)?/, '')
        .replace(/\/$/, '');
      const link = (
        <a
          key={`${keyPrefix}-url-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-red hover:underline break-all"
        >
          {display}
        </a>
      );
      return trailing ? [link, trailing] : [link];
    }
    return [seg];
  });
}

const INLINE_TOKEN =
  /(\[[^\]]*?\]\([^)]*?\)|\*\*.+?\*\*|`[^`]*?`|(?<![\w*])\*[^*\s](?:[^*]*?[^*\s])?\*(?![\w*])|(?<![\w])_[^_\s](?:[^_]*?[^_\s])?_(?![\w]))/g;

export function renderInlineMarkdown(text: string, keyPrefix = '') {
  const parts = text.split(INLINE_TOKEN);
  return parts.map((part, index) => {
    if (part === '') return null;
    const key = `${keyPrefix}${index}`;
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-red hover:underline"
        >
          {renderInlineMarkdown(linkMatch[1], `${key}-`)}
        </a>
      );
    }

    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={key}>
          {renderInlineMarkdown(boldMatch[1], `${key}-`)}
        </strong>
      );
    }

    const codeMatch = part.match(/^`(.*)`$/);
    if (codeMatch) {
      return (
        <code key={key} className="rounded bg-surface-elevated px-1 py-0.5">
          {codeMatch[1]}
        </code>
      );
    }

    const italicMatch = part.match(/^(?:\*([^*].*)\*|_([^_].*)_)$/);
    if (italicMatch) {
      return (
        <em key={key}>
          {renderInlineMarkdown(italicMatch[1] ?? italicMatch[2], `${key}-`)}
        </em>
      );
    }

    return <span key={key}>{renderAutoLinkedText(part, key)}</span>;
  });
}

type TextItem =
  | { kind: 'bullet'; depth: number; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'ordered'; depth: number; marker: string; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'rule' };

/** Two spaces (or a tab) of indentation is one list level. */
function listDepth(rawLine: string): number {
  const indent = rawLine.match(/^[ \t]*/)?.[0] ?? '';
  const width = indent.replace(/\t/g, '  ').length;
  return Math.min(Math.floor(width / 2), 3);
}

/**
 * Prep markdown is hard-wrapped at ~95 columns, so one sentence arrives as
 * three lines and a bullet's links trail on indented continuations. Only a
 * blank line is a real break: everything else folds back into the block it
 * continues, so a paragraph renders as a paragraph.
 */
function groupTextLines(lines: string[]): TextItem[] {
  const items: TextItem[] = [];
  let isOpen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed === '' || trimmed === '>') {
      isOpen = false;
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      items.push({ kind: 'rule' });
      isOpen = false;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      items.push({
        kind: 'heading',
        level: heading[1].length,
        text: heading[2],
      });
      isOpen = false;
      continue;
    }

    const bullet = trimmed.match(/^(?:-+|[*+])\s+(.+)$/);
    if (bullet) {
      items.push({
        depth: listDepth(rawLine),
        kind: 'bullet',
        text: bullet[1],
      });
      isOpen = true;
      continue;
    }

    const ordered = trimmed.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (ordered) {
      items.push({
        depth: listDepth(rawLine),
        kind: 'ordered',
        marker: `${ordered[1]}.`,
        text: ordered[2],
      });
      isOpen = true;
      continue;
    }

    const last = items[items.length - 1];
    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      if (isOpen && last?.kind === 'quote') last.text += ` ${quote[1]}`;
      else items.push({ kind: 'quote', text: quote[1] });
      isOpen = true;
      continue;
    }

    if (isOpen && last && last.kind !== 'heading' && last.kind !== 'rule') {
      last.text += ` ${trimmed}`;
    } else items.push({ kind: 'paragraph', text: trimmed });
    isOpen = true;
  }

  return items;
}

interface MarkdownTable {
  align: Array<'center' | 'left' | 'right' | null>;
  header: string[];
  rows: string[][];
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

/** Splits `| a | b \| c |` into cells, keeping escaped pipes inside a cell. */
function splitTableRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

/**
 * A GitHub-style pipe table: a header row, a `|---|` separator, then rows.
 * Pipe lines without a separator are not a table and stay as text.
 */
function parseTable(lines: string[]): MarkdownTable | null {
  if (lines.length < 2) return null;
  const separator = splitTableRow(lines[1]);
  if (!separator.every((cell) => TABLE_SEPARATOR_CELL.test(cell))) return null;

  const header = splitTableRow(lines[0]);
  return {
    align: separator.map((cell) => {
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
      if (cell.endsWith(':')) return 'right';
      if (cell.startsWith(':')) return 'left';
      return null;
    }),
    header,
    rows: lines.slice(2).map((line) => {
      const cells = splitTableRow(line);
      return header.map((_, index) => cells[index] ?? '');
    }),
  };
}

type MarkdownBlock =
  | { code: string; kind: 'code' }
  | { kind: 'table'; table: MarkdownTable }
  | { kind: 'text'; lines: string[] };

function parseBlocks(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let textLines: string[] = [];
  let codeLines: string[] = [];
  let tableLines: string[] = [];
  let inCodeBlock = false;

  const flushText = () => {
    if (textLines.some((textLine) => textLine.trim().length > 0)) {
      blocks.push({ kind: 'text', lines: textLines });
    }
    textLines = [];
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    const table = parseTable(tableLines);
    if (table) {
      flushText();
      blocks.push({ kind: 'table', table });
    } else {
      textLines.push(...tableLines);
    }
    tableLines = [];
  };

  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ code: codeLines.join('\n').trimEnd(), kind: 'code' });
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushTable();
        flushText();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (TABLE_ROW.test(line)) {
      tableLines.push(line);
      continue;
    }

    flushTable();
    textLines.push(line);
  }

  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ code: codeLines.join('\n').trimEnd(), kind: 'code' });
  }

  flushTable();
  flushText();
  return blocks;
}

const LIST_INDENT = ['pl-5', 'pl-10', 'pl-14', 'pl-[4.5rem]'];

export function MarkdownBody({
  body,
  large,
}: {
  body: string;
  large?: boolean;
}) {
  const blocks = parseBlocks(body);
  const textSize = large ? 'text-lg' : 'text-sm';
  const leading = large ? 'leading-[1.8]' : 'leading-relaxed';

  return (
    <div className={large ? 'space-y-4' : 'space-y-2.5'}>
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'code') {
          return (
            <pre
              key={`code-${blockIndex}`}
              className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm leading-relaxed text-text-primary"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.kind === 'table') {
          const { align, header, rows } = block.table;
          return (
            <div
              key={`table-${blockIndex}`}
              className="overflow-x-auto rounded-lg border border-surface-border"
            >
              <table className="w-full border-collapse text-left text-sm leading-relaxed">
                <thead className="bg-surface-elevated text-text-primary">
                  <tr>
                    {header.map((cell, cellIndex) => (
                      <th
                        key={cellIndex}
                        scope="col"
                        className="border-b border-surface-border px-3 py-2 font-semibold"
                        style={
                          align[cellIndex]
                            ? { textAlign: align[cellIndex] }
                            : undefined
                        }
                      >
                        {renderInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-surface-border last:border-b-0"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 align-top"
                          style={
                            align[cellIndex]
                              ? { textAlign: align[cellIndex] }
                              : undefined
                          }
                        >
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return groupTextLines(block.lines).map((item, index) => {
          const key = `${blockIndex}-${index}`;

          if (item.kind === 'rule') {
            return <hr key={key} className="border-surface-border" />;
          }

          if (item.kind === 'heading') {
            const headingClass =
              item.level <= 3
                ? `text-base font-semibold ${leading} text-text-primary`
                : item.level === 4
                  ? `text-sm font-semibold ${leading} text-text-secondary`
                  : `text-sm font-medium ${leading} text-text-muted`;
            return (
              <p key={key} className={headingClass}>
                {renderInlineMarkdown(item.text)}
              </p>
            );
          }

          if (item.kind === 'bullet') {
            return (
              <p
                key={key}
                className={`${LIST_INDENT[item.depth]} ${textSize} ${leading} text-text-secondary before:-ml-5 before:mr-2 before:text-accent-red before:content-['-']`}
              >
                {renderInlineMarkdown(item.text)}
              </p>
            );
          }

          if (item.kind === 'ordered') {
            return (
              <p
                key={key}
                className={`${LIST_INDENT[item.depth]} ${textSize} ${leading} text-text-secondary`}
              >
                <span className="-ml-5 mr-1.5 inline-block min-w-[1.25rem] font-semibold tabular-nums text-accent-red">
                  {item.marker}
                </span>
                {renderInlineMarkdown(item.text)}
              </p>
            );
          }

          if (item.kind === 'quote') {
            return (
              <blockquote
                key={key}
                className={`border-l-2 border-accent-red/50 pl-4 ${textSize} ${leading} text-text-primary`}
              >
                {renderInlineMarkdown(item.text)}
              </blockquote>
            );
          }

          return (
            <p
              key={key}
              className={`${textSize} ${leading} text-text-secondary`}
            >
              {renderInlineMarkdown(item.text)}
            </p>
          );
        });
      })}
    </div>
  );
}
