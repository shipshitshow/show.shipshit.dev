#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DEFAULT_REPO = 'shipshitshow/vault';

function parseArgs(argv) {
  const args = { channel: 'all', format: 'json', top: 3, vault: DEFAULT_REPO };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--vault' && argv[i + 1]) {
      args.vault = argv[++i];
    } else if (arg === '--channel' && argv[i + 1]) {
      args.channel = argv[++i];
    } else if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
    } else if (arg === '--top' && argv[i + 1]) {
      args.top = Number(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  console.log(
    [
      'Usage: analyze-vault-performance.js [--vault <path|repo|url>] [--channel livestreams|videos|shorts|all] [--format json|pretty] [--top N]',
      '',
      'Examples:',
      '  node analyze-vault-performance.js --vault /path/to/vault --channel videos --format pretty',
      '  node analyze-vault-performance.js --vault https://github.com/shipshitshow/vault --channel all --format json',
      '  node analyze-vault-performance.js --vault shipshitshow/vault --channel shorts --top 5 --format pretty',
    ].join('\n'),
  );
}

function ensureCommand(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Required command not found: ${cmd}`);
  }
}

function parseRepoSpec(input) {
  if (/^https?:\/\/github\.com\//i.test(input)) {
    const match = input.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)/i);
    return match ? match[1].replace(/\.git$/, '') : null;
  }
  if (/^[^/]+\/[^/]+$/.test(input)) {
    return input.replace(/\.git$/, '');
  }
  return null;
}

function resolveVaultRoot(vaultArg) {
  if (vaultArg && fs.existsSync(vaultArg)) {
    return { cleanup: null, kind: 'local', root: path.resolve(vaultArg) };
  }

  const repo = parseRepoSpec(vaultArg || DEFAULT_REPO);
  if (!repo) {
    throw new Error(
      `Vault path does not exist and is not a GitHub repo: ${vaultArg}`,
    );
  }

  ensureCommand('curl');
  ensureCommand('tar');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-analysis-'));
  let extractedRoot = null;

  for (const branch of ['master', 'main']) {
    const archivePath = path.join(tmpDir, `${branch}.tar.gz`);
    const archiveUrl = `https://codeload.github.com/${repo}/tar.gz/refs/heads/${branch}`;
    try {
      execFileSync('curl', ['-L', '-s', '-f', archiveUrl, '-o', archivePath], {
        stdio: 'inherit',
      });
      execFileSync('tar', ['-xzf', archivePath, '-C', tmpDir], {
        stdio: 'inherit',
      });
      extractedRoot = fs
        .readdirSync(tmpDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(tmpDir, entry.name))
        .find((entryPath) =>
          path
            .basename(entryPath)
            .startsWith(path.basename(repo).split('/').pop()),
        );
      if (extractedRoot) {
        break;
      }
    } catch (error) {
      // Try the next branch name.
    }
  }

  if (!extractedRoot) {
    throw new Error(`Failed to extract vault archive for ${repo}`);
  }

  return {
    cleanup: () => fs.rmSync(tmpDir, { force: true, recursive: true }),
    kind: 'github',
    repo,
    root: extractedRoot,
  };
}

function readFileIfPresent(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  const lines = match[1].split('\n');
  const data = {};
  let currentListKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (/^\s*-\s+/.test(line) && currentListKey) {
      const value = sanitizeFrontmatterValue(line.replace(/^\s*-\s+/, ''));
      data[currentListKey].push(value);
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyValue) {
      currentListKey = null;
      continue;
    }

    const [, key, rawValue] = keyValue;
    if (rawValue === '') {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    currentListKey = null;
    data[key] = sanitizeFrontmatterValue(rawValue);
  }

  return data;
}

function sanitizeFrontmatterValue(value) {
  return value
    .replace(/^"|"$/g, '')
    .replace(/```/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const match = markdown.match(regex);
  return match ? match[1].trim() : '';
}

function tokenizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length > 2);
}

function classifyTitlePatterns(title) {
  const patterns = new Set();
  if (/\bvs\b|versus|not even close|verdict/i.test(title)) {
    patterns.add('comparison');
  }
  if (
    /killed|dead|save it|won't let|too powerful|replaced|destroyed/i.test(title)
  ) {
    patterns.add('conflict');
  }
  if (/disaster|lose your .* job|nightmare|gone wrong|breach/i.test(title)) {
    patterns.add('disaster');
  }
  if (/^how to|install|setup|tutorial/i.test(title)) {
    patterns.add('tutorial');
  }
  if (/\b\d+\b|million|days|months|week/i.test(title)) {
    patterns.add('number-time');
  }
  if (/\?|what|why|how/i.test(title)) {
    patterns.add('curiosity');
  }
  if (/controls my computer|built|rebuild|automate|chatting/i.test(title)) {
    patterns.add('demonstration');
  }
  return [...patterns];
}

function collectEntries(root, channelKey) {
  const base =
    channelKey === 'shorts'
      ? path.join(root, 'shipshitshowclips', 'Shorts')
      : path.join(
          root,
          'shipshitshow',
          channelKey === 'livestreams' ? 'Livestreams' : 'Videos',
        );
  const entries = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    if (fs.existsSync(path.join(dir, 'overview.md'))) {
      const entry = loadEntry(root, dir, channelKey);
      if (entry) entries.push(entry);
      return;
    }
    for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        child.isDirectory() &&
        !child.name.startsWith('_') &&
        !child.name.startsWith('.')
      ) {
        visit(path.join(dir, child.name));
      }
    }
  }
  visit(base);
  return entries;
}

function loadEntry(root, dirPath, format) {
  const overviewPath = path.join(dirPath, 'overview.md');
  if (!fs.existsSync(overviewPath)) {
    return null;
  }

  const overview = fs.readFileSync(overviewPath, 'utf8');
  const frontmatter = parseFrontmatter(overview);
  const title = frontmatter.title || path.basename(dirPath);
  const parsedViews = Number(frontmatter.view_count);
  const views =
    frontmatter.view_count !== undefined &&
    Number.isFinite(parsedViews) &&
    parsedViews >= 0
      ? parsedViews
      : null;
  const youtubeTags = Array.isArray(frontmatter.youtube_tags)
    ? frontmatter.youtube_tags
    : [];

  return {
    date: frontmatter.date || '',
    description: readFileIfPresent(path.join(dirPath, 'description.md')),
    dirPath,
    format,
    patterns: classifyTitlePatterns(title),
    relativePath: path.relative(root, dirPath),
    summary: extractSection(overview, 'Summary'),
    title,
    titleTokens: tokenizeTitle(title),
    transcript: readFileIfPresent(path.join(dirPath, 'transcript.md')),
    views,
    youtubeTags,
  };
}

function summarizeChannel(entries, topN) {
  const observed = entries.filter((entry) => entry.views !== null);
  const viewValues = observed.map((entry) => entry.views).sort((a, b) => a - b);
  const count = viewValues.length;
  const patterns = new Map();
  const tags = new Map();
  for (const entry of entries) {
    for (const pattern of entry.patterns)
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    for (const tag of new Set(
      entry.youtubeTags.map((value) => value.toLowerCase()),
    )) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }
  }
  return {
    averageViews: count
      ? Number((viewValues.reduce((a, b) => a + b, 0) / count).toFixed(1))
      : null,
    count: entries.length,
    entriesWithViewSnapshot: count,
    medianViews: count
      ? count % 2
        ? viewValues[Math.floor(count / 2)]
        : (viewValues[count / 2 - 1] + viewValues[count / 2]) / 2
      : null,
    mostViewedSnapshots: [...observed]
      .sort((a, b) => b.views - a.views)
      .slice(0, topN)
      .map(trimEntry),
    recentExamples: [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, topN)
      .map(trimEntry),
    tagOccurrences: [...tags]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, occurrences]) => ({ occurrences, tag })),
    titlePatternOccurrences: [...patterns]
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, occurrences]) => ({ occurrences, pattern })),
  };
}

function trimEntry(entry) {
  return {
    date: entry.date,
    patterns: entry.patterns,
    relativePath: entry.relativePath,
    title: entry.title,
    views: entry.views,
    youtubeTags: entry.youtubeTags.slice(0, 8),
  };
}

function renderPretty(report, requestedChannels) {
  const lines = ['# Vault Channel Snapshot', '', report.interpretation, ''];
  for (const channel of requestedChannels) {
    const summary = report.channels[channel];
    lines.push(
      `## ${channel}`,
      '',
      `- entries: ${summary.count}`,
      `- entries with view snapshots: ${summary.entriesWithViewSnapshot}`,
      '',
      '### Recent examples',
    );
    for (const item of summary.recentExamples)
      lines.push(
        `- ${item.date}: ${item.title} (${item.views === null ? 'views unknown' : item.views + ' snapshot views'})`,
      );
    lines.push('', '### Descriptive title patterns');
    for (const item of summary.titlePatternOccurrences)
      lines.push(`- ${item.pattern}: ${item.occurrences} entries`);
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  if (!['livestreams', 'videos', 'shorts', 'all'].includes(args.channel))
    throw new Error('Invalid --channel');
  if (!['json', 'pretty'].includes(args.format))
    throw new Error('Invalid --format');
  if (!Number.isInteger(args.top) || args.top < 1)
    throw new Error('--top must be a positive integer');
  const source = resolveVaultRoot(args.vault);
  const requestedChannels =
    args.channel === 'all'
      ? ['livestreams', 'videos', 'shorts']
      : [args.channel];

  try {
    const report = {
      channels: {},
      interpretation:
        'Descriptive archive snapshots only. Upload ages, view observation dates, impressions, CTR, retention and traffic are not normalized; no causal winners or failures can be inferred.',
      source: {
        kind: source.kind,
        repo: source.repo || null,
        root: source.root,
      },
    };

    for (const channel of requestedChannels) {
      const entries = collectEntries(source.root, channel);
      report.channels[channel] = summarizeChannel(entries, args.top);
    }

    if (args.format === 'pretty') {
      console.log(renderPretty(report, requestedChannels));
      return;
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (typeof source.cleanup === 'function') {
      source.cleanup();
    }
  }
}

main();
