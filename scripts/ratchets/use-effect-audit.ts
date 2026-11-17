// Ratchet for React useEffect. See "React effects" in CLAUDE.md.
//
// Counts, per non-test source file:
//   use_effect                  every useEffect(...) call
//   async_effect_without_abort  useEffect callbacks that await, call .then or
//                               fetch and never mention AbortController,
//                               AbortSignal or signal
//
// A new file or a higher count fails. A lower count also fails until the
// baseline is pruned with --write, so the baseline can only shrink.
//
// Escape hatch, on the line directly above the call (a reason is required):
//   // use-effect-audit: ignore <reason>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const METRICS = ['async_effect_without_abort', 'use_effect'] as const;
export type Metric = (typeof METRICS)[number];
export type FileCounts = Record<Metric, number>;
export type Counts = Record<string, FileCounts>;

export interface BadIgnore {
  line: number;
  reason: string;
}

export interface ScanResult {
  counts: FileCounts;
  ignored: number;
  badIgnores: BadIgnore[];
}

export const BASELINE_PATH = 'scripts/ratchets/baselines/use-effect-audit.json';

const ABORT_NAMES = new Set(['AbortController', 'AbortSignal', 'signal']);
const IGNORE_PATTERN =
  /^\s*\/\/\s*use-effect-audit:\s*ignore(?:\s+(\S.*?))?\s*$/;
const SOURCE_PATTERN = /^(apps|packages)\/.+\.(?:[cm]?[jt]sx?)$/;
const TEST_PATTERN =
  /(?:\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)__tests__\/|\.d\.ts$)/;

export function isAuditedSource(file: string): boolean {
  return SOURCE_PATTERN.test(file) && !TEST_PATTERN.test(file);
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('x')) {
    return file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  }
  return file.endsWith('.ts') || file.endsWith('.mts') || file.endsWith('.cts')
    ? ts.ScriptKind.TS
    : ts.ScriptKind.JS;
}

function isUseEffectCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const callee = node.expression;
  return (
    (ts.isIdentifier(callee) && callee.text === 'useEffect') ||
    (ts.isPropertyAccessExpression(callee) && callee.name.text === 'useEffect')
  );
}

function isAsyncWithoutAbort(callback: ts.Node): boolean {
  let isAsync = false;
  let hasAbort = false;
  const visit = (node: ts.Node) => {
    if (ts.isAwaitExpression(node)) {
      isAsync = true;
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (
        (ts.isIdentifier(callee) && callee.text === 'fetch') ||
        (ts.isPropertyAccessExpression(callee) &&
          (callee.name.text === 'then' || callee.name.text === 'fetch'))
      ) {
        isAsync = true;
      }
    }
    if (ts.isIdentifier(node) && ABORT_NAMES.has(node.text)) {
      hasAbort = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(callback);
  return isAsync && !hasAbort;
}

export function scanSource(file: string, text: string): ScanResult {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.ES2022,
    true,
    scriptKind(file),
  );
  const lines = text.split('\n');
  const result: ScanResult = {
    badIgnores: [],
    counts: { async_effect_without_abort: 0, use_effect: 0 },
    ignored: 0,
  };
  const visit = (node: ts.Node) => {
    if (isUseEffectCall(node)) {
      const line =
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const above =
        line >= 2 ? IGNORE_PATTERN.exec(lines[line - 2] ?? '') : null;
      if (above?.[1]) {
        result.ignored += 1;
      } else {
        if (above) {
          result.badIgnores.push({
            line: line - 1,
            reason: 'ignore comment needs a reason',
          });
        }
        result.counts.use_effect += 1;
        const callback = node.arguments[0];
        if (
          callback &&
          (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
          isAsyncWithoutAbort(callback)
        ) {
          result.counts.async_effect_without_abort += 1;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

export function listSourceFiles(root: string): string[] {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output
    .split('\0')
    .filter(
      (file) =>
        file && isAuditedSource(file) && existsSync(path.join(root, file)),
    )
    .sort();
}

export function scanRepo(root: string) {
  const counts: Counts = {};
  const badIgnores: Array<BadIgnore & { file: string }> = [];
  let ignored = 0;
  for (const file of listSourceFiles(root)) {
    const scan = scanSource(file, readFileSync(path.join(root, file), 'utf8'));
    ignored += scan.ignored;
    for (const bad of scan.badIgnores) {
      badIgnores.push({ ...bad, file });
    }
    if (scan.counts.use_effect > 0) {
      counts[file] = scan.counts;
    }
  }
  return { badIgnores, counts, ignored };
}

export function compareCounts(baseline: Counts, current: Counts): string[] {
  const problems: string[] = [];
  const files = [
    ...new Set([...Object.keys(baseline), ...Object.keys(current)]),
  ].sort();
  for (const file of files) {
    for (const metric of METRICS) {
      const before = baseline[file]?.[metric] ?? 0;
      const now = current[file]?.[metric] ?? 0;
      if (now > before) {
        problems.push(
          baseline[file]
            ? `${file}: ${metric} grew from ${before} to ${now}`
            : `${file}: new file with ${metric} = ${now}`,
        );
      } else if (now < before) {
        problems.push(
          `${file}: ${metric} fell from ${before} to ${now}; prune the baseline with: bun run check:effects --write`,
        );
      }
    }
  }
  return problems;
}

export function serializeBaseline(counts: Counts): string {
  const sorted: Counts = {};
  for (const file of Object.keys(counts).sort()) {
    const entry = counts[file];
    if (entry) {
      sorted[file] = {
        async_effect_without_abort: entry.async_effect_without_abort,
        use_effect: entry.use_effect,
      };
    }
  }
  return `${JSON.stringify({ files: sorted }, null, 2)}\n`;
}

export function parseBaseline(text: string): Counts {
  const parsed = JSON.parse(text) as { files?: Counts };
  return parsed.files ?? {};
}

function main(): number {
  const root = path.resolve(import.meta.dir, '..', '..');
  const baselineFile = path.join(root, BASELINE_PATH);
  const write = process.argv.includes('--write');
  const { badIgnores, counts, ignored } = scanRepo(root);

  for (const bad of badIgnores) {
    console.error(`${bad.file}:${bad.line}: ${bad.reason}`);
  }
  if (badIgnores.length > 0) {
    return 1;
  }

  const exists = existsSync(baselineFile);
  const baseline = exists
    ? parseBaseline(readFileSync(baselineFile, 'utf8'))
    : {};

  if (write) {
    const grew = compareCounts(baseline, counts).filter(
      (line) => !line.includes('fell from'),
    );
    if (exists && grew.length > 0) {
      console.error('Refusing to write: the baseline may only shrink.');
      for (const line of grew) {
        console.error(`  ${line}`);
      }
      return 1;
    }
    writeFileSync(baselineFile, serializeBaseline(counts));
    console.log(`Wrote ${BASELINE_PATH}`);
    return 0;
  }

  const problems = compareCounts(baseline, counts);
  const total = Object.values(counts).reduce((sum, c) => sum + c.use_effect, 0);
  const unsafe = Object.values(counts).reduce(
    (sum, c) => sum + c.async_effect_without_abort,
    0,
  );
  if (problems.length > 0) {
    console.error('useEffect ratchet failed:');
    for (const line of problems) {
      console.error(`  ${line}`);
    }
    console.error(
      'Replace the effect (derived state, event handler, data hook, key). Subscribing to a system outside React may use: // use-effect-audit: ignore <reason>',
    );
    return 1;
  }
  console.log(
    `useEffect ratchet ok: ${total} effects, ${unsafe} async without abort, ${ignored} ignored.`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
