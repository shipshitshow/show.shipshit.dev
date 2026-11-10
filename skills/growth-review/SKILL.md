---
name: growth-review
description: Review how a published episode performed against the channel's own history, seven days after publishing or after three or four episodes. Use for a weekly performance check, a lever review or a list of old videos worth unlisting.
---

# Growth review

Say how an episode did compared with the channel's other episodes, what the data
can and cannot show, and which lever to keep, change or drop. Nothing here is a
forecast, a grade for the hosts or a reason to publish, unlist or edit anything.

## Invocation

- `$growth-review` — the latest livestream, against its peers.
- `$growth-review <video id>` — a specific episode.
- `$growth-review last 4 livestreams` — the lever review after three or four episodes.
- `$growth-review unlist` — old videos that meet the unlist rule.

## 1. Get the data

Read the channel profile for where the inventory lives, and refresh it first if it
is older than a day (for Ship Sh*t Show: `bun scripts/refresh-youtube-inventory.ts
--write`, which needs `YOUTUBE_API_KEY`). The inventory only holds today's
cumulative counts. For a real seven-day figure, use a snapshot from near day 7
(the inventory file's git history has one per refresh) as `--previous-inventory`.

Retention curves, watch time and traffic sources need YouTube Analytics. They are
not reachable from a cloud container: ask for a session on the machine that holds
the channel's OAuth tokens, or use a Studio export. Click-through rate and
impressions are in neither the inventory nor the Analytics API; they come from a
Studio export or the Reporting API. If a source is missing, say so and review
with what exists.

## 2. Measure

```bash
python3 -I scripts/growth_review.py --inventory <inventory.json> [--episode <id> | --type livestream --last 4] \
  [--previous-inventory <older.json>] [--retention <retention.json>] --format md
```

Per episode it gives views, age, views per day, likes per 1000 views, the median
and quartiles of comparable items (same type, public, at least seven days old),
the ratio to that median with the channel's own band, the rank, the title length
against the one-line rule, views gained since the previous snapshot against peers'
gains, retention against peers' at each mark of the video's length, and a list of
public videos under 50 views and over four weeks old. Ages are counted to the
snapshot date, not today.

## 3. Read it

- **The ratio is relative to this channel.** "Ahead" means ahead of its siblings.
  Topic counts as much as craft; do not credit a delivery change for a view count.
- **Age confounds views.** Cumulative views favour older items. An episode under
  seven days old gets "wait", not a verdict. Prefer views gained since a snapshot.
- **Livestream views include the live audience.**
- **Small samples.** Four or five episodes show a direction at best. State the
  number of peers beside every ratio and call one outlier an outlier.
- **Retention.** Report where the episode falls furthest below peers' median and
  read the transcript at that moment before suggesting a cause. A curve says
  where viewers left, not why.
- **No reach data, no thumbnail verdict.** A thumbnail or title lever can only be
  called with click-through from a Studio export; views alone cannot separate the
  two.

## 4. Review the lever

For the last three or four episodes, write each one's lever from the channel's
growth checklist (one concrete business outcome in the title and opening, the
payoff by 45 seconds, no host faces, and so on) from the title, thumbnail and
opening, not from the numbers. Then say per lever: keep, change or drop, with the
episodes and ratios behind it and what the evidence cannot show. Do not call a
lever from fewer than three episodes.

## 5. Unlisting

List candidates from the script with views and age. Unlisting changes public
videos: propose the list and wait for an explicit go-ahead naming the videos. Never
delete, and recheck recent ones before proposing.

## 6. Output

Use [the review shape](references/review-shape.md). Lead with the verdict per
episode in one line, then the table, the lever calls, and what to pull next
(retention, click-through). Save it in the episode's working folder, outside any
public repository. Return the path and the two or three findings that matter in
chat.

## Final check

Is every ratio accompanied by its peer count and age caveat? Does any sentence
credit a cause the data cannot show? Is an episode younger than seven days judged?
Was anything unlisted, published or changed without a named go-ahead?
