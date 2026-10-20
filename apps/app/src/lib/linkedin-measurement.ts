import type { EpisodeLinkedInMeasurement, Topic } from '@shipshitshow/types';
import { readLinkedInPosts } from '@/lib/linkedin-metrics-store';
import { getTopicsForDate } from '@/lib/livestreams-store';
import { fetchCampaignClicks } from '@/lib/posthog/client';
import { buildEpisodeCampaign, extractEpisodeNumber } from '@/lib/utm';

/**
 * Joins the two halves of LinkedIn measurement for one episode (issue #20):
 * UTM click-through read back from PostHog, and post metrics typed in by hand
 * because LinkedIn's API does not expose personal-profile analytics.
 *
 * This is the shape the per-episode Distribution tab renders and the shape the
 * cross-episode rollup (#18) consumes, so both agree on what "not tracked"
 * means instead of each inventing its own zero.
 */

interface EpisodeIdentity {
  campaign: string | null;
  episodeNumber: number | null;
}

/**
 * The campaign slug comes from the topic that declares the episode number —
 * the prep file carrying `- Episode number: **#24**`. Topic slugs are stable
 * for the life of the file, whereas archive titles are derived from whichever
 * topics exist, so anchoring on the slug keeps a campaign pointing at the same
 * episode after the rundown is edited.
 */
function resolveEpisodeIdentity(topics: Topic[]): EpisodeIdentity {
  for (const topic of topics) {
    const episodeNumber = extractEpisodeNumber(topic.content);
    if (episodeNumber === null) continue;

    return {
      campaign: buildEpisodeCampaign(episodeNumber, topic.slug),
      episodeNumber,
    };
  }

  return { campaign: null, episodeNumber: null };
}

export async function getEpisodeLinkedInMeasurement(
  date: string,
): Promise<EpisodeLinkedInMeasurement> {
  const [topics, posts] = await Promise.all([
    getTopicsForDate(date),
    readLinkedInPosts(date),
  ]);

  const { campaign, episodeNumber } = resolveEpisodeIdentity(topics);

  // No episode number means no campaign was ever minted, so there is nothing
  // for PostHog to have counted — a different fact from "counted, got zero".
  const utmClicks = campaign
    ? await fetchCampaignClicks(campaign)
    : ({
        clicks: null,
        error: null,
        provenance: 'posthog',
        status: 'no_campaign',
      } as const);

  return { campaign, date, episodeNumber, posts, utmClicks };
}
