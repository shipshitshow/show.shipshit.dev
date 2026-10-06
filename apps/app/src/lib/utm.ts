import type { EpisodeCampaign, UtmSource } from '@shipshitshow/types';
import { UTM_MEDIUM } from '@shipshitshow/types';

/**
 * The UTM convention every link published to LinkedIn or X must carry:
 *
 *   ?utm_source=linkedin&utm_medium=social&utm_campaign=ep-<NN>-<slug>
 *
 * The campaign identifies the *episode*, not the channel, so the same value is
 * reused on X with `utm_source=x`. This mirrors the contract in
 * `skills/linkedin/SKILL.md` — change both together or attribution
 * silently splits across channels.
 */

/**
 * Campaigns are interpolated into HogQL (see `lib/posthog/client.ts`), so the
 * shape is validated rather than trusted. Only lowercase alphanumerics and
 * single dashes survive `buildEpisodeCampaign`, which leaves nothing to escape.
 */
const CAMPAIGN_PATTERN = /^ep-(\d{1,4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** `- Episode number: **#24**` in the topic's Livestream Notes section. */
const EPISODE_NUMBER_PATTERN =
  /episode\s*(?:number)?\s*:\s*\*{0,2}#?\s*(\d{1,4})/i;

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds `ep-24-quota-endgame`. Returns null when the episode number or slug
 * cannot produce a well-formed campaign — an untagged link is better than a
 * malformed campaign that quietly attributes clicks to the wrong episode.
 */
export function buildEpisodeCampaign(
  episodeNumber: number | null,
  slug: string,
): string | null {
  if (
    episodeNumber === null ||
    !Number.isInteger(episodeNumber) ||
    episodeNumber <= 0 ||
    episodeNumber > 9999
  ) {
    return null;
  }

  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  const campaign = `ep-${episodeNumber}-${normalized}`;
  return CAMPAIGN_PATTERN.test(campaign) ? campaign : null;
}

export function parseEpisodeCampaign(campaign: string): EpisodeCampaign | null {
  const match = campaign.match(CAMPAIGN_PATTERN);
  if (!match) return null;

  return {
    campaign,
    episodeNumber: Number(match[1]),
    slug: match[2],
  };
}

export function isEpisodeCampaign(campaign: string): boolean {
  return CAMPAIGN_PATTERN.test(campaign);
}

/**
 * Reads the episode number out of a topic's markdown body. Prep files carry it
 * as `- Episode number: **#24**` under Livestream Notes; older files repeat it
 * further down, so the first match wins.
 */
export function extractEpisodeNumber(content: string): number | null {
  const match = content.match(EPISODE_NUMBER_PATTERN);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Tags a published URL for a channel. Existing query parameters and fragments
 * survive; existing `utm_*` values are overwritten so re-tagging is idempotent.
 * Returns null for anything that is not an absolute http(s) URL, so callers
 * surface the problem instead of publishing a link PostHog cannot attribute.
 */
export function buildUtmUrl(
  url: string,
  { campaign, source }: { campaign: string; source: UtmSource },
): string | null {
  if (!isEpisodeCampaign(campaign)) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  parsed.searchParams.set('utm_source', source);
  parsed.searchParams.set('utm_medium', UTM_MEDIUM);
  parsed.searchParams.set('utm_campaign', campaign);

  return parsed.toString();
}
