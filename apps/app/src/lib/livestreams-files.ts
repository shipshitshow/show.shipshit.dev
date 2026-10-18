import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), 'data', 'livestream');
const DRAWINGS_DIR = 'drawings';
const X_POSTS_FILE = 'x-posts.json';

export function isTopicMarkdownFile(fileName: string): boolean {
  return /^topic-\d{2}-.+\.md$/.test(fileName);
}

export function findTopicFile(slug: string, date: string): string | null {
  const dir = path.join(DATA_DIR, date);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter(isTopicMarkdownFile);
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    if (raw.includes(`slug: "${slug}"`)) {
      return path.join(dir, file);
    }
  }

  return null;
}

export function getTopicDrawingFile(slug: string, date: string): string | null {
  const topicFile = findTopicFile(slug, date);
  if (!topicFile) return null;

  return path.join(
    path.dirname(topicFile),
    DRAWINGS_DIR,
    `${slug}.excalidraw.json`,
  );
}

/** Episode-level X author-post metrics live next to that date's topic files. */
export function getEpisodeXPostsFile(date: string): string {
  return path.join(DATA_DIR, date, X_POSTS_FILE);
}
