/**
 * Pushes a word-level transcript to the app's transcript editor
 * (show.shipshit.dev/library/edits). Saved cuts for the same id are kept.
 *
 *   bun run edits:push <id> <transcript.json>                 # local data/edits
 *   PRODUCER_STORAGE=redis VERCEL_ENV=production \
 *     bun run edits:push <id> <transcript.json> --commit      # production Redis
 *
 * The file format is in docs/show-prep/transcript-editing.md. Without
 * --commit it only checks the file and prints what it would store.
 */
import { readFile } from 'node:fs/promises';
import { getProducerStorageBackend } from '../lib/producer-storage';
import { isEditId, parseEditSession, summarise } from '../lib/transcript-edit';
import { saveEditSession } from '../lib/transcript-edit-store';

const [id, file] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const commit = process.argv.includes('--commit');

if (!isEditId(id) || !file)
  throw new Error(
    'Usage: bun run edits:push <id> <transcript.json> [--commit]. The id is lowercase letters, digits, dots and hyphens.',
  );

const body: unknown = JSON.parse(await readFile(file, 'utf8'));
const session = parseEditSession(body, id);
const flagged = session.words.filter((word) => word.flag).length;
process.stdout.write(
  `${JSON.stringify({
    ...summarise(session, new Date().toISOString()),
    backend: getProducerStorageBackend(),
    flagged,
    mode: commit ? 'commit' : 'check',
  })}\n`,
);

if (commit) {
  if (getProducerStorageBackend() === 'redis' && !process.env.VERCEL_ENV)
    throw new Error(
      'Set VERCEL_ENV to the namespace to write, e.g. production.',
    );
  await saveEditSession(id, body);
  process.stdout.write(`${JSON.stringify({ pushed: id })}\n`);
}
