/**
 * Per-episode cross-platform rollup (issue #18).
 *
 * Every number is wrapped in {@link EpisodeMetric} rather than being a bare
 * `number`. That is deliberate and load-bearing: epic #9 forbids zero-faking, so
 * a surface with no data must be structurally incapable of reporting `0`. The
 * union makes "we measured nothing" and "we measured zero" different types, and
 * the reason travels with the metric so the UI can say *why* it is blank.
 */

export type NotTrackedReason =
  /**
   * No distribution checklist (#17) exists for the episode, so we cannot even
   * say whether something was published. Distinct from `no_asset`, which is a
   * recorded "nothing shipped here".
   */
  | 'no_checklist'
  /** The checklist records nothing published on this surface. */
  | 'no_asset'
  /** An asset exists, but metric ingestion for that platform hasn't landed. */
  | 'no_integration'
  /** Asset and ingestion both exist; the platform reported nothing for it. */
  | 'no_data';

export interface TrackedMetric {
  state: 'tracked';
  value: number;
}

export interface NotTrackedMetric {
  state: 'not_tracked';
  reason: NotTrackedReason;
}

export type EpisodeMetric = TrackedMetric | NotTrackedMetric;

export interface EpisodeAssetLink {
  url: string;
  label: string;
}

interface EpisodeSurface {
  /** Published assets backing this cell, in publish order. */
  assets: EpisodeAssetLink[];
}

export interface FlagshipSurface extends EpisodeSurface {
  views: EpisodeMetric;
  /** Click-through rate as a percentage, e.g. `8.3`. */
  ctr: EpisodeMetric;
  avgViewPercentage: EpisodeMetric;
}

export interface LivestreamSurface extends EpisodeSurface {
  views: EpisodeMetric;
}

export interface ShortsSurface extends EpisodeSurface {
  /** Views summed across every short published for the episode. */
  views: EpisodeMetric;
}

export interface XSurface extends EpisodeSurface {
  impressions: EpisodeMetric;
}

export interface LinkedInSurface extends EpisodeSurface {
  /** UTM-attributed clicks. */
  clicks: EpisodeMetric;
}

export interface LeadsSurface {
  count: EpisodeMetric;
}

export interface EpisodeRollupRow {
  /** Stream date, `YYYY-MM-DD`. Unique per row and the join key throughout. */
  date: string;
  title: string;
  /** In-app route to the episode detail page. */
  href: string;
  /** YouTube thumbnail of the edited video, else of the livestream. */
  thumbnailUrl: string | null;
  flagship: FlagshipSurface;
  livestream: LivestreamSurface;
  shorts: ShortsSurface;
  x: XSurface;
  linkedin: LinkedInSurface;
  leads: LeadsSurface;
}

export interface EpisodeRollupResponse {
  episodes: EpisodeRollupRow[];
  /**
   * False when no YouTube credentials are configured. Distinguishes "YouTube is
   * connected and this episode has no video" from "we cannot see YouTube at
   * all", which the UI surfaces differently.
   */
  isYouTubeConnected: boolean;
  generatedAt: string;
}
