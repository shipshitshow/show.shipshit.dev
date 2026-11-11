import type {
  DistributionAssetType,
  EpisodeAssetLink,
  EpisodeDistribution,
  EpisodeDistributionAsset,
  EpisodeLinkedInMeasurement,
  EpisodeMetric,
  EpisodeRollupResponse,
  EpisodeRollupRow,
  NotTrackedReason,
  XEpisodeMetrics,
} from '@shipshitshow/types';
import { todayLocalDate } from '@/lib/date';
import { readEpisodeDistributions } from '@/lib/distribution-store';
import {
  type EpisodeVideoMatch,
  matchEpisodeVideos,
} from '@/lib/episode-video-match';
import { countLeadsByEpisode, listLeads } from '@/lib/leads-store';
import { getEpisodeLinkedInMeasurement } from '@/lib/linkedin-measurement';
import {
  type LivestreamArchiveItem,
  listLivestreamArchive,
} from '@/lib/livestreams-store';
import { listEpisodeXMetrics } from '@/lib/livestreams-x-posts';
import { extractVideoId } from '@/lib/livestreams-youtube';
import { logError } from '@/lib/logger';
import { getVideoReach } from '@/lib/video-reach-store';
import {
  type ChannelUpload,
  fetchChannelUploads,
  fetchVideoRetentionMetrics,
  fetchVideosByIds,
} from '@/lib/youtube/client';
import {
  getAccessToken,
  getChannelConfigs,
  hasYouTubeCredentials,
  isYouTubeReauthError,
} from '@/lib/youtube/token';

/**
 * Builds the per-episode cross-platform rollup (#18).
 *
 * Rows are episodes; columns are the surfaces of the weekly publish system.
 * Published-asset URLs from the distribution checklist (#17) are the join key —
 * YouTube video IDs are parsed back out of them and matched against the Data and
 * Analytics APIs.
 *
 * Each platform integration keeps unknown data as null. The rollup converts a
 * real measured zero to `tracked(0)` and every missing value to a not-tracked
 * reason, preserving epic #9's no-zero-faking contract.
 */

/** An asset the checklist marks as live, narrowed so `url` is non-null. */
type PublishedAsset = EpisodeDistributionAsset & { url: string };

interface YouTubeVideoMetrics {
  views: number;
  /** Percentage, e.g. `8.3`. Null when the Analytics API reported nothing. */
  ctr: number | null;
  avgViewPercentage: number | null;
}

const ASSET_LABELS: Record<DistributionAssetType, string> = {
  flagship_video: 'Flagship video',
  linkedin_post: 'LinkedIn post',
  livestream: 'Livestream',
  playbook: 'Playbook',
  short: 'Short',
  x_post: 'X post',
};

function tracked(value: number): EpisodeMetric {
  return { state: 'tracked', value };
}

function notTracked(reason: NotTrackedReason): EpisodeMetric {
  return { reason, state: 'not_tracked' };
}

function getPublishedAssets(
  distribution: EpisodeDistribution | undefined,
  type: DistributionAssetType,
): PublishedAsset[] {
  return (distribution?.assets ?? []).filter(
    (asset): asset is PublishedAsset =>
      asset.type === type && asset.status === 'published' && asset.url !== null,
  );
}

function toAssetLinks(assets: PublishedAsset[]): EpisodeAssetLink[] {
  return assets.map((asset, index) => ({
    label:
      asset.label ??
      (assets.length > 1
        ? `${ASSET_LABELS[asset.type]} ${index + 1}`
        : ASSET_LABELS[asset.type]),
    url: asset.url,
  }));
}

function mergeAssetLinks(...groups: EpisodeAssetLink[][]): EpisodeAssetLink[] {
  const byUrl = new Map<string, EpisodeAssetLink>();
  for (const group of groups) {
    for (const link of group) {
      if (!byUrl.has(link.url)) byUrl.set(link.url, link);
    }
  }
  return Array.from(byUrl.values());
}

function toXAssetLinks(
  metrics: XEpisodeMetrics | undefined,
): EpisodeAssetLink[] {
  return (metrics?.posts ?? []).flatMap((post, index) =>
    post.url ? [{ label: `X post ${index + 1}`, url: post.url }] : [],
  );
}

function toLinkedInAssetLinks(
  measurement: EpisodeLinkedInMeasurement | undefined,
): EpisodeAssetLink[] {
  return (measurement?.posts ?? []).flatMap((post, index) =>
    post.postUrl
      ? [{ label: `LinkedIn post ${index + 1}`, url: post.postUrl }]
      : [],
  );
}

/**
 * The single place that decides why a cell has no number, so the distinction
 * between "nothing published", "nothing recorded", "we can't measure this
 * surface" and "the platform had nothing to say" is made once and consistently.
 */
function resolveNotTrackedReason(
  hasChecklist: boolean,
  assetCount: number,
  isIngestionAvailable: boolean,
): NotTrackedReason {
  if (assetCount === 0) return hasChecklist ? 'no_asset' : 'no_checklist';
  if (!isIngestionAvailable) return 'no_integration';
  return 'no_data';
}

/**
 * Resolve one YouTube-backed number. `metrics` being undefined means the video
 * never resolved at all, which is a different story from the video resolving but
 * the Analytics API withholding that particular figure.
 */
function resolveYouTubeMetric(
  metrics: YouTubeVideoMetrics | undefined,
  select: (metrics: YouTubeVideoMetrics) => number | null,
  notTrackedFallback: NotTrackedReason,
): EpisodeMetric {
  if (!metrics) return notTracked(notTrackedFallback);

  const value = select(metrics);
  return value === null ? notTracked('no_data') : tracked(value);
}

function collectVideoIds(assets: PublishedAsset[]): string[] {
  return assets
    .map((asset) => extractVideoId(asset.url))
    .filter((id): id is string => id !== null);
}

function collectMetrics(
  assets: PublishedAsset[],
  metrics: Map<string, YouTubeVideoMetrics>,
): YouTubeVideoMetrics[] {
  return collectVideoIds(assets)
    .map((id) => metrics.get(id))
    .filter((entry): entry is YouTubeVideoMetrics => entry !== undefined);
}

/** Single-asset surfaces (flagship, livestream) take the first resolved video. */
function findMetrics(
  assets: PublishedAsset[],
  metrics: Map<string, YouTubeVideoMetrics>,
): YouTubeVideoMetrics | undefined {
  return collectMetrics(assets, metrics)[0];
}

/**
 * Video-level YouTube metrics keyed by video ID.
 *
 * Each configured channel is queried for every requested ID: the Analytics API
 * only returns rows for videos the channel owns, so a "clips" upload would be
 * silently dropped if only the first channel were asked. The first channel that
 * knows a video wins, matching `fetchVideoStats` in `livestreams-youtube.ts`.
 */
async function fetchYouTubeMetrics(
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, YouTubeVideoMetrics>> {
  const metrics = new Map<string, YouTubeVideoMetrics>();
  if (!videoIds.length) return metrics;

  const channels = await getChannelConfigs();
  if (!channels.length) return metrics;

  // Impressions and CTR are not in the Analytics API. They come from the stored
  // daily Reporting API reach reports, which cover both channels at once.
  const reach = await getVideoReach(videoIds, startDate, endDate);

  const perChannel = await Promise.all(
    channels.map(async (channel) => {
      const token = await getAccessToken(channel);
      const [videos, retention] = await Promise.all([
        fetchVideosByIds(token, channel.id, videoIds),
        // Retention is a nice-to-have on this page: a failed query is logged
        // and the cell renders as not tracked, but the failure is never silent.
        fetchVideoRetentionMetrics(
          token,
          channel.id,
          videoIds,
          startDate,
          endDate,
        ).catch((error: unknown) => {
          logError('episode_rollup.retention_failed', error, {
            channel: channel.label,
          });
          return new Map<string, { avg_view_percentage: number }>();
        }),
      ]);
      return { retention, videos };
    }),
  );

  for (const { retention, videos } of perChannel) {
    for (const video of videos) {
      if (metrics.has(video.video_id)) continue;

      // A zero (or a video absent from the stored reach data) means "not reported for this range", the
      // same convention VideoTable already applies to CTR. Null keeps it out of
      // the tracked state instead of rendering a misleading 0%.
      const ctr = reach.get(video.video_id)?.ctr ?? 0;
      const avgViewPercentage =
        retention.get(video.video_id)?.avg_view_percentage ?? 0;

      metrics.set(video.video_id, {
        avgViewPercentage: avgViewPercentage > 0 ? avgViewPercentage : null,
        ctr: ctr > 0 ? ctr : null,
        views: video.views,
      });
    }
  }

  return metrics;
}

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Channel uploads across every connected channel; one failing channel is skipped. */
async function fetchAllUploads(): Promise<ChannelUpload[]> {
  const channels = await getChannelConfigs();
  const perChannel = await Promise.all(
    channels.map(async (channel) => {
      try {
        const token = await getAccessToken(channel);
        return await fetchChannelUploads(token, channel.id);
      } catch (error) {
        // A dead refresh token must still surface as "reconnect YouTube".
        if (isYouTubeReauthError(error)) throw error;
        logError('episode_rollup.uploads_failed', error);
        return [];
      }
    }),
  );
  return perChannel.flat();
}

/**
 * The checklist (#17) wins whenever it lists published assets. Only when it has
 * none do we fall back to the video matched from the channel's uploads, so
 * hand-entered links are never overridden.
 */
function withMatchedAssets(
  date: string,
  distribution: EpisodeDistribution | undefined,
  match: EpisodeVideoMatch | undefined,
): EpisodeDistribution | undefined {
  if (!match) return distribution;

  const matched: PublishedAsset[] = [];
  const hasFlagship = getPublishedAssets(distribution, 'flagship_video').length;
  if (!hasFlagship && match.flagshipId) {
    matched.push(matchedAsset('flagship_video', match.flagshipId, 1));
  }
  if (!getPublishedAssets(distribution, 'short').length) {
    match.shortIds.forEach((id, index) => {
      matched.push(matchedAsset('short', id, index + 1));
    });
  }
  if (matched.length === 0) return distribution;

  return {
    assets: [...(distribution?.assets ?? []), ...matched],
    date,
    updatedAt: distribution?.updatedAt ?? null,
  };
}

function matchedAsset(
  type: 'flagship_video' | 'short',
  videoId: string,
  slot: number,
): PublishedAsset {
  return {
    id: `${type}-matched-${slot}`,
    isOptional: false,
    label: type === 'short' ? `Short ${slot}` : ASSET_LABELS[type],
    platform: 'youtube',
    publishedAt: null,
    status: 'published',
    type,
    url: youtubeWatchUrl(videoId),
  };
}

function buildEpisodeHref(episode: LivestreamArchiveItem): string {
  return episode.videoId
    ? `/content/livestreams/${encodeURIComponent(episode.videoId)}`
    : `/content/livestreams/${encodeURIComponent(episode.date)}`;
}

/**
 * The livestream falls back to the video already known from the transcript
 * archive and topic notes. That fallback is what makes this view useful before
 * #17 lands: without it every row would be empty on day one.
 */
function getLivestreamAssets(
  distribution: EpisodeDistribution | undefined,
  episode: LivestreamArchiveItem,
): PublishedAsset[] {
  const fromChecklist = getPublishedAssets(distribution, 'livestream');
  if (fromChecklist.length > 0) return fromChecklist;
  if (!episode.youtubeUrl) return [];

  return [
    {
      id: 'livestream-fallback-1',
      isOptional: false,
      label: 'Livestream',
      platform: 'youtube',
      publishedAt: null,
      status: 'published',
      type: 'livestream',
      url: episode.youtubeUrl,
    },
  ];
}

/** The edited video's thumbnail when there is one, else the stream's. */
function episodeThumbnail(
  flagship: PublishedAsset[],
  livestream: PublishedAsset[],
  episode: LivestreamArchiveItem,
): string | null {
  const id =
    collectVideoIds(flagship)[0] ??
    collectVideoIds(livestream)[0] ??
    episode.videoId;
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

function buildRow(
  episode: LivestreamArchiveItem,
  distribution: EpisodeDistribution | undefined,
  metrics: Map<string, YouTubeVideoMetrics>,
  isYouTubeConnected: boolean,
  xMetrics: XEpisodeMetrics | undefined,
  linkedinMeasurement: EpisodeLinkedInMeasurement | undefined,
  leadCount: number,
  hasChecklist: boolean,
): EpisodeRollupRow {
  const flagshipAssets = getPublishedAssets(distribution, 'flagship_video');
  const livestreamAssets = getLivestreamAssets(distribution, episode);
  const shortAssets = getPublishedAssets(distribution, 'short');
  const xAssets = getPublishedAssets(distribution, 'x_post');
  const linkedinAssets = getPublishedAssets(distribution, 'linkedin_post');

  const flagshipMetrics = findMetrics(flagshipAssets, metrics);
  const flagshipMissing = resolveNotTrackedReason(
    hasChecklist,
    flagshipAssets.length,
    isYouTubeConnected,
  );

  const livestreamMetrics = findMetrics(livestreamAssets, metrics);
  const shortMetrics = collectMetrics(shortAssets, metrics);

  const xAssetLinks = mergeAssetLinks(
    toAssetLinks(xAssets),
    toXAssetLinks(xMetrics),
  );
  const linkedinAssetLinks = mergeAssetLinks(
    toAssetLinks(linkedinAssets),
    toLinkedInAssetLinks(linkedinMeasurement),
  );
  const xMissing = resolveNotTrackedReason(
    hasChecklist,
    xAssetLinks.length,
    true,
  );
  const linkedinMissing = resolveNotTrackedReason(
    hasChecklist,
    linkedinAssetLinks.length,
    true,
  );
  const xImpressions = xMetrics?.totals.impressions;
  const linkedinClicks =
    linkedinMeasurement?.utmClicks.status === 'ok'
      ? linkedinMeasurement.utmClicks.clicks?.linkedin
      : undefined;

  return {
    date: episode.date,
    flagship: {
      assets: toAssetLinks(flagshipAssets),
      avgViewPercentage: resolveYouTubeMetric(
        flagshipMetrics,
        (entry) => entry.avgViewPercentage,
        flagshipMissing,
      ),
      ctr: resolveYouTubeMetric(
        flagshipMetrics,
        (entry) => entry.ctr,
        flagshipMissing,
      ),
      views: resolveYouTubeMetric(
        flagshipMetrics,
        (entry) => entry.views,
        flagshipMissing,
      ),
    },
    href: buildEpisodeHref(episode),
    leads: { count: tracked(leadCount) },
    linkedin: {
      assets: linkedinAssetLinks,
      clicks:
        linkedinClicks === undefined
          ? notTracked(linkedinMissing)
          : tracked(linkedinClicks),
    },
    livestream: {
      assets: toAssetLinks(livestreamAssets),
      views: resolveYouTubeMetric(
        livestreamMetrics,
        (entry) => entry.views,
        resolveNotTrackedReason(
          hasChecklist,
          livestreamAssets.length,
          isYouTubeConnected,
        ),
      ),
    },
    shorts: {
      assets: toAssetLinks(shortAssets),
      views: shortMetrics.length
        ? tracked(shortMetrics.reduce((sum, entry) => sum + entry.views, 0))
        : notTracked(
            resolveNotTrackedReason(
              hasChecklist,
              shortAssets.length,
              isYouTubeConnected,
            ),
          ),
    },
    thumbnailUrl: episodeThumbnail(flagshipAssets, livestreamAssets, episode),
    title: episode.title,
    x: {
      assets: xAssetLinks,
      impressions:
        xImpressions === null || xImpressions === undefined
          ? notTracked(xMissing)
          : tracked(xImpressions),
    },
  };
}

export async function buildEpisodeRollup(): Promise<EpisodeRollupResponse> {
  const today = todayLocalDate();
  const episodes = (await listLivestreamArchive())
    .filter((episode) => episode.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const generatedAt = new Date().toISOString();
  const isYouTubeConnected = hasYouTubeCredentials();

  if (episodes.length === 0) {
    return { episodes: [], generatedAt, isYouTubeConnected };
  }

  const dates = episodes.map((episode) => episode.date);
  const [distributions, xMetrics, linkedinMeasurements, leads] =
    await Promise.all([
      readEpisodeDistributions(dates),
      listEpisodeXMetrics(dates),
      Promise.all(dates.map(getEpisodeLinkedInMeasurement)),
      listLeads(),
    ]);
  const xMetricsByDate = new Map(
    xMetrics.map((entry) => [entry.date, entry] as const),
  );
  const linkedinByDate = new Map(
    linkedinMeasurements.map((entry) => [entry.date, entry] as const),
  );
  const leadsByEpisode = countLeadsByEpisode(leads);

  // Link each episode's flagship and Shorts from the channels themselves, so
  // the rollup works without anyone filling in the checklist first.
  const matches = isYouTubeConnected
    ? matchEpisodeVideos(
        dates,
        await fetchAllUploads(),
        new Set(
          episodes.flatMap((episode) =>
            episode.videoId ? [episode.videoId] : [],
          ),
        ),
      )
    : new Map<string, EpisodeVideoMatch>();
  const effectiveDistributions = new Map(
    episodes.map((episode) => [
      episode.date,
      withMatchedAssets(
        episode.date,
        distributions.get(episode.date),
        matches.get(episode.date),
      ),
    ]),
  );

  const videoIds = new Set<string>();
  for (const episode of episodes) {
    const distribution = effectiveDistributions.get(episode.date);
    for (const assets of [
      getPublishedAssets(distribution, 'flagship_video'),
      getLivestreamAssets(distribution, episode),
      getPublishedAssets(distribution, 'short'),
    ]) {
      for (const id of collectVideoIds(assets)) videoIds.add(id);
    }
  }

  // Widest useful window: the Analytics API needs an explicit range, and the
  // rollup reports lifetime-to-date numbers rather than a rolling period.
  const startDate = episodes[episodes.length - 1].date;
  const metrics = isYouTubeConnected
    ? await fetchYouTubeMetrics(Array.from(videoIds), startDate, today)
    : new Map<string, YouTubeVideoMetrics>();

  return {
    episodes: episodes.map((episode) =>
      buildRow(
        episode,
        effectiveDistributions.get(episode.date),
        metrics,
        isYouTubeConnected,
        xMetricsByDate.get(episode.date),
        linkedinByDate.get(episode.date),
        leadsByEpisode[episode.date] ?? 0,
        distributions.has(episode.date),
      ),
    ),
    generatedAt,
    isYouTubeConnected,
  };
}
