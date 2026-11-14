import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The Shorts pipeline (editing/scripts/shorts) is Python. CI only runs bun tests, so this runs its
// unittest suite. The pure-logic tests need no Pillow or ffmpeg; the caption-image tests skip without them.
const SHORTS = resolve(
  import.meta.dir,
  '../../../../../editing/scripts/shorts',
);

function python(): string | null {
  for (const bin of ['python3', 'python']) {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return bin;
  }
  return null;
}

describe('editing/scripts/shorts python tests', () => {
  const bin = python();
  test.skipIf(!bin || !existsSync(SHORTS))('unittest suite passes', () => {
    const r = spawnSync(
      bin as string,
      ['-m', 'unittest', 'discover', '-s', SHORTS, '-p', 'test_*.py'],
      {
        encoding: 'utf8',
      },
    );
    expect(`${r.stdout}${r.stderr}`).toContain('OK');
    expect(r.status).toBe(0);
  });
});
