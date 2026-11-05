'use client';

export type RuleKey = 'hero' | 'logo' | 'text' | 'guess' | 'distinct';
export type RuleState = '' | 'pass' | 'fail' | 'na';
export type RuleChecks = Record<RuleKey, RuleState>;

export const EMPTY_RULES: RuleChecks = {
  distinct: '',
  guess: '',
  hero: '',
  logo: '',
  text: '',
};

const RULES: { key: RuleKey; label: string; fail: string }[] = [
  {
    fail: 'Build one big 3D hero metaphor or scene in physical materials.',
    key: 'hero',
    label: 'One big 3D hero metaphor',
  },
  {
    fail: 'Use the correct company logo, large and built into the scene.',
    key: 'logo',
    label: 'Correct logo, large + integrated',
  },
  {
    fail: 'Cut the text down to almost none.',
    key: 'text',
    label: 'Almost no text',
  },
  {
    fail: 'Make the topic obvious: a viewer should be able to guess the video title from the image alone.',
    key: 'guess',
    label: 'Title guessable from the image alone',
  },
  {
    fail: 'Make the video and live artwork clearly different from each other.',
    key: 'distinct',
    label: 'Distinct from its video/live twin',
  },
];

const FAIL_PREFIX = '- ';

function failedRuleLines(checks: RuleChecks): string[] {
  return RULES.filter((rule) => checks[rule.key] === 'fail').map(
    (rule) => FAIL_PREFIX + rule.fail,
  );
}

/** Keeps rule lines in the feedback note in sync with the failed rules. */
export function syncRuleFeedback(feedback: string, checks: RuleChecks): string {
  const ruleLines = new Set(RULES.map((rule) => FAIL_PREFIX + rule.fail));
  const kept = feedback.split('\n').filter((line) => !ruleLines.has(line));
  const own = kept.join('\n').trimEnd();
  const lines = failedRuleLines(checks);
  if (!lines.length) return own;
  return (own ? own + '\n' : '') + lines.join('\n');
}

const STATES: { value: Exclude<RuleState, ''>; label: string }[] = [
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'N/A', value: 'na' },
];

export function RuleChecklist({
  checks,
  disabled,
  onChange,
}: {
  checks: RuleChecks;
  disabled: boolean;
  onChange: (key: RuleKey, state: RuleState) => void;
}) {
  return (
    <fieldset className="mt-4 border-t border-surface-border pt-4">
      <legend className="text-[10px] uppercase tracking-wider text-text-muted">
        Rule check
      </legend>
      <ul className="mt-3 space-y-2">
        {RULES.map((rule) => (
          <li
            key={rule.key}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span>{rule.label}</span>
            <span className="flex shrink-0 gap-1">
              {STATES.map((state) => {
                const on = checks[rule.key] === state.value;
                return (
                  <button
                    key={state.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    onClick={() => onChange(rule.key, on ? '' : state.value)}
                    className={
                      'min-h-8 rounded-md border px-2 text-[11px] disabled:opacity-40 ' +
                      (on
                        ? state.value === 'fail'
                          ? 'border-accent-red bg-accent-red/15 text-accent-red'
                          : state.value === 'pass'
                            ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400'
                            : 'border-text-muted bg-surface-elevated text-text-primary'
                        : 'border-surface-border text-text-muted')
                    }
                  >
                    {state.label}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-4 text-text-muted">
        Faces: famous people only, so viewers recognise the brand. No hosts, no
        random faces.
      </p>
      <p className="mt-1 text-[10px] leading-4 text-text-muted">
        Failed rules are added to the revision note. Approve is blocked while a
        rule is marked Fail.
      </p>
    </fieldset>
  );
}

const SIZES = [
  { label: 'Mobile feed', width: 168 },
  { label: 'Sidebar', width: 246 },
  { label: 'Desktop feed', width: 360 },
];

/** Shows the thumbnail at the sizes YouTube really renders it. */
export function RealSizePreview({ alt, src }: { alt: string; src: string }) {
  return (
    <section
      aria-label="Real-size preview"
      className="mt-4 rounded-xl border border-surface-border p-4"
    >
      <p className="text-[10px] uppercase tracking-wider text-text-muted">
        Real-size check · does the hero and logo still read at feed size?
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        {SIZES.map((size) => (
          <figure key={size.width} className="m-0">
            <img
              src={src}
              alt={alt}
              width={size.width}
              height={Math.round((size.width * 9) / 16)}
              style={{ height: 'auto', width: size.width }}
              className="rounded-md outline outline-1 -outline-offset-1 outline-white/10"
            />
            <figcaption className="mt-1 text-[10px] text-text-muted">
              {size.label} · {size.width}px
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const REFERENCES = [
  {
    file: 'openai-vs-anthropic.jpg',
    label: 'OpenAI vs Anthropic (live) · favourite',
  },
  {
    file: 'chatgpt-images.jpg',
    label: 'ChatGPT Images 2.0 (live) · favourite',
  },
  { file: 'openclaw-discord.jpg', label: 'OpenClaw on Discord' },
  { file: 'ai-loops.jpg', label: 'AI loops' },
  { file: 'genfeed-launch.jpg', label: 'Genfeed launch (live)' },
  { file: 'npm-compromised.jpg', label: 'NPM compromised' },
];

/** The approved thumbnails to compare against. */
export function ReferenceRail() {
  return (
    <details className="mb-4 rounded-xl border border-surface-border">
      <summary className="cursor-pointer px-4 py-3 text-xs text-text-secondary">
        Approved references · one big 3D hero metaphor, correct logos built into
        the scene, almost no text, title guessable at a glance
      </summary>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
        {REFERENCES.map((ref) => (
          <figure key={ref.file} className="m-0">
            <img
              src={'/labs/thumbnail-references/' + ref.file}
              alt={'Approved reference: ' + ref.label}
              loading="lazy"
              className="aspect-video w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
            />
            <figcaption className="mt-1 text-[10px] text-text-muted">
              {ref.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </details>
  );
}
