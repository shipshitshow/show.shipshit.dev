import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type StampFormat,
  type StampKind,
  stampThumbnail,
} from '../lib/thumbnail-stamp';

const USAGE = `Stamp the show asterisk on finished thumbnail art.

Usage:
  bun run thumbnail:stamp --in <art.png> --out <thumb.png> --kind live|video [--format landscape|shorts] [--x <px> --y <px>]

--kind live    red master, for an actual livestream
--kind video   white master, for any edited video or recap
--format       landscape (1920x1080, default) or shorts (1080x1920).
               Shorts covers always get the red mark, at x880/y345 (the
               Short video mark sits higher, at y230).
--x, --y       Optional top-left override of the mark, in canvas pixels.
               Give both. Normally leave them out: the vault table decides.

Relative paths resolve from the repository root.
Size and position come from the vault placement table via brand-tokens.json.
Generate the art without text and with the upper-right left empty. Nothing is
uploaded.`;

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

// Like show:prep, relative paths resolve from the repository root.
const repoRoot = path.resolve(import.meta.dir, '../../../..');

async function main() {
  const args = process.argv.slice(2);
  const inArg = arg(args, '--in'),
    outArg = arg(args, '--out'),
    input = inArg && path.resolve(repoRoot, inArg),
    output = outArg && path.resolve(repoRoot, outArg),
    kind = arg(args, '--kind'),
    format = arg(args, '--format') ?? 'landscape',
    xArg = arg(args, '--x'),
    yArg = arg(args, '--y'),
    position =
      xArg !== undefined && yArg !== undefined
        ? { x: Number(xArg), y: Number(yArg) }
        : undefined;
  if (
    !input ||
    !output ||
    (kind !== 'live' && kind !== 'video') ||
    (format !== 'landscape' && format !== 'shorts') ||
    (xArg === undefined) !== (yArg === undefined) ||
    (position &&
      !(Number.isInteger(position.x) && Number.isInteger(position.y)))
  )
    throw new Error(USAGE);
  const bytes = await stampThumbnail(await readFile(input), {
    format: format as StampFormat,
    kind: kind as StampKind,
    position,
  });
  await writeFile(output, bytes, { flag: 'wx' });
  console.log(output);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
