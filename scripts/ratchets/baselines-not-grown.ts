// "Baseline may not grow" check. Every ratchet baseline registered here is
// compared with the copy on the pull request's base branch. A ratchet already
// fails when code outgrows its baseline; this closes the other door, where a
// pull request raises the baseline to make the ratchet pass.
//
// Usage: bun scripts/ratchets/baselines-not-grown.ts [base-ref]
// The base ref defaults to origin/master. A baseline that does not exist on
// the base ref yet is new and is accepted once.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  type Counts,
  METRICS,
  parseBaseline,
  BASELINE_PATH as USE_EFFECT_BASELINE,
} from './use-effect-audit.ts';

// Add every new ratchet baseline here.
export const REGISTERED_BASELINES = [USE_EFFECT_BASELINE];

export function findGrowth(base: Counts, head: Counts): string[] {
  const problems: string[] = [];
  for (const file of Object.keys(head).sort()) {
    for (const metric of METRICS) {
      const before = base[file]?.[metric] ?? 0;
      const now = head[file]?.[metric] ?? 0;
      if (now > before) {
        problems.push(
          base[file]
            ? `${file}: ${metric} baseline grew from ${before} to ${now}`
            : `${file}: new baseline entry with ${metric} = ${now}`,
        );
      }
    }
  }
  return problems;
}

function readBase(root: string, ref: string, file: string): string | null {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function main(): number {
  const root = path.resolve(import.meta.dir, '..', '..');
  const ref = process.argv[2] ?? 'origin/master';
  let failed = false;
  for (const file of REGISTERED_BASELINES) {
    const base = readBase(root, ref, file);
    if (base === null) {
      console.log(`${file}: not on ${ref}, accepted as new.`);
      continue;
    }
    const problems = findGrowth(
      parseBaseline(base),
      parseBaseline(readFileSync(path.join(root, file), 'utf8')),
    );
    for (const problem of problems) {
      console.error(problem);
      failed = true;
    }
    if (problems.length === 0) {
      console.log(`${file}: has not grown since ${ref}.`);
    }
  }
  return failed ? 1 : 0;
}

if (import.meta.main) {
  process.exit(main());
}
