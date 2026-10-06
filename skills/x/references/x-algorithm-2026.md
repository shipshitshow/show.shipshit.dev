# X Algorithm — August 2026 dump

Canonical source: https://github.com/xai-org/x-algorithm

Use this file. Do **not** use the `x-content` plugin docs (`docs/01-ranking-signals.md` etc.). Those are an April 2023 Heavy Ranker table plus the "1 report = 468 likes" mistake. The Aug 14 2026 dump exists to kill that reading.

## What the feed actually does

Phoenix predicts, per viewer and post, a probability (or a continuous value) for each action. `RankingScorer` does:

```
score = Σ (weight_i × P(action_i))
```

then applies author-diversity decay, an out-of-network discount, and a new-author boost. See `home-mixer/scorers/ranking_scorer.rs` and `home-mixer/params/param.rs`.

Weights scale **predicted P(action)** (and predicted dwell time). They do not scale raw counts. A large report weight does not mean "one report cancels N likes." Report is rare, so the weight exists so a high *predicted* P(report) for *this viewer* can move the score at all. Predictions are personalized from that viewer's history.

## Actions the model scores

From the Aug 13/14 2026 README:

- Engagement: favorite, reply, repost, quote, share, share via DM, share via copy link
- Clicks: post, profile, link, photo expand, video open, quoted post
- Attention: video quality view, dwell, dwell time, click dwell time, active seconds
- Author: follow author
- Negative: not interested, mute author, block author, report, not dwelled

Write for **reply, dwell / dwell time, profile click, share**. Those are the useful positives for a builder account. Favorite is scored and cheap. Video completion is not why we post.

Avoid raising predicted **mute, block, report, not-interested, not-dwelled**. Off-niche dumps, rage-bait, and "agree or disagree?" closers do that.

## Filters that change the calendar

Pre-scoring, in `home-mixer/filters/`:

- `AgeFilter` — posts **older than 48 hours** are out of For You.
- `AuthorSocialgraphFilter` — blocked/muted authors dropped for that viewer.
- `PreviouslySeenPostsFilter` / `PreviouslyServedPostsFilter` — already shown, gone.
- `OONRetweetReplyFilter` — OON replies/reposts dropped; missing parent dropped.

Scoring adjustments:

- **Author diversity** — each extra post from the same author in the slate is multiplied by a decaying factor down to a floor. Do not dump many originals in a row.
- **Out-of-network discount** — non-followers, and (when the flag is on) even in-network replies/reposts, are multiplied by a factor below 1. Original in-network posts are the cheap path.
- **New-author boost** — only if impressions are below a threshold. Do not write as if we have it.

Visibility filtering (`visibility-filtering/`) is a different service. It can DROP a post after ranking. Spam and bait never get a chance to "score their way out."

## First hour

Thunder serves recent posts from accounts the viewer follows. That is the in-network pool. Out-of-network (Phoenix retrieval + SimClusters) only sees you after the model predicts this *non-follower* will engage.

Practical: the first hour of replies and dwell from actual followers is the only lever we have. Be present. Reply for real. Do not immediately publish the next original (diversity decay + you just left the conversation).

## What this is not

- Not a license to write engagement bait because "replies are weighted."
- Not a license to thread every thought because 2023 self-reply weights said 75.0.
- Not count-equivalence arithmetic. If a draft needs a number from `param.rs`, open the file. Do not invent one.
