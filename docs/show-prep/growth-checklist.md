# Weekly growth checklist

Working hypothesis, 2026-10-26 (Vincent's direction, from the channel inventory
fetched 2026-10-26): episodes whose title and opening promise one concrete
business outcome (customers found, money made, a cost cut) get more first-week
views than pure model news. Evidence so far is view counts only; there is no
retention or click-through data yet. This is a hypothesis to test over 3–4
episodes, not a result.

In the 59-video inventory the top results were operator-in-the-business angles
(Grok Bot finding customers, post-AGI money, the SpaceX Grok Bot setup) and
head-to-head model comparisons. Standalone model-news videos lagged.

## Per episode

1. Choose one founder question with a business outcome in the title.
2. Follow [the opening and Shorts format](editorial-format.md): both hosts and a
   useful visual on screen, payoff stated, first useful point by about 45 seconds.
3. Prepare 3–5 narrow Shorts angles with one debatable question. Do not script
   disagreement or invent results.
4. Thumbnails are topic-first with no faces, because viewers do not know the
   hosts yet. Livestream thumbnails use the red asterisk; videos use white/black.
   The thumbnail skills carry the details.
5. After recording, mark the actual clip boundaries against the video and VTT.
6. Refresh the inventory with `bun scripts/refresh-youtube-inventory.ts --write`
   (needs `YOUTUBE_API_KEY` in the root `.env`).

## Review after 3–4 episodes

Compare views at 7 days against the median in `channel-inventory.json`, plus
click-through and average view duration from YouTube Studio. Keep, change or drop
the lever based on that.

## Hiding old videos

Unlist rather than delete, and only videos that are both under 50 views and old
enough to have had a fair chance (more than about four weeks). Recheck recent
ones before deciding.
