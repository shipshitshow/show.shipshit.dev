import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { isTopicStatus } from '../livestreams-store';

const DATA_DIR = path.join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'data',
  'livestream',
);

function readFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  return Object.fromEntries(
    match[1].split('\n').flatMap((line) => {
      const index = line.indexOf(':');
      if (index === -1) return [];
      const value = line
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      return [[line.slice(0, index).trim(), value]];
    }),
  );
}

const dates = fs
  .readdirSync(DATA_DIR, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name),
  )
  .map((entry) => entry.name);

describe('livestream topic archive (#72)', () => {
  for (const date of dates) {
    const files = fs
      .readdirSync(path.join(DATA_DIR, date))
      .filter((name) => /^topic-\d{2}-.+\.md$/.test(name));

    test(`${date}: topics have valid frontmatter, unique slugs and unique numbers`, () => {
      const slugs = new Set<string>();
      const numbers = new Set<string>();

      for (const file of files) {
        const raw = fs.readFileSync(path.join(DATA_DIR, date, file), 'utf8');
        const fm = readFrontmatter(raw);
        const [, number, fileSlug] =
          file.match(/^topic-(\d{2})-(.+)\.md$/) ?? [];

        expect({
          file,
          source: 'source' in fm,
          title: Boolean(fm.title),
        }).toEqual({
          file,
          source: true,
          title: true,
        });
        expect({ file, status: isTopicStatus(fm.status ?? null) }).toEqual({
          file,
          status: true,
        });
        expect({ date: fm.date, file }).toEqual({ date, file });
        expect({ file, slug: fm.slug }).toEqual({ file, slug: fileSlug });
        expect(slugs.has(fm.slug)).toBe(false);
        expect(numbers.has(number)).toBe(false);
        slugs.add(fm.slug);
        numbers.add(number);
      }
    });
  }
});
