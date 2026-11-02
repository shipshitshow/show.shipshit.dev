/**
 * The artifacts library: assets made to be shown during a livestream. Every
 * entry has a public page at `/artifacts/<slug>`.
 */
export type ArtifactKind = 'timeline' | 'tweets';

export interface ArtifactEntry {
  kind: ArtifactKind;
  slug: string;
  summary: string;
  title: string;
  /** Last content check, `YYYY-MM-DD`. */
  updated: string;
}

export const ARTIFACTS: ArtifactEntry[] = [
  {
    kind: 'timeline',
    slug: 'agent-security-timeline',
    summary:
      'PHP2Shell, the trojanized Claude Code extension on Cursor and the AI-agent intrusions around them, in date order. Every entry shows its sources and how far they were checked.',
    title: 'Bot Swarm Timeline',
    updated: '2026-11-02',
  },
  {
    kind: 'tweets',
    slug: 'agent-security-tweets',
    summary:
      'The X posts behind the timeline, as a full-screen slideshow: the PHP2Shell disclosure and the Cursor extension incident.',
    title: 'Bot Swarm Tweets',
    updated: '2026-11-02',
  },
];

export function getArtifact(slug: string): ArtifactEntry | undefined {
  return ARTIFACTS.find((artifact) => artifact.slug === slug);
}
