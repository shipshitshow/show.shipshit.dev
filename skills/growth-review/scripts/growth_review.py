#!/usr/bin/env python3
"""Compare an episode's performance with the channel's own history.

Input is the channel inventory JSON (`apps/app/data/youtube/channel-inventory.json`
for Ship Sh*t Show: items with id, title, type, publishedAt, viewCount, likeCount,
commentCount, duration_seconds_flat, privacyStatus; top-level `fetchedAt`).
Optional: an earlier snapshot of the same file (views gained since), and a
retention file `{video_id: {"r01": 0.94, "r05": 0.58, ...}}` (share of viewers
still watching at 1%, 5%... of the video's length, from YouTube Analytics).

The script measures; it does not decide. Ages are counted to the snapshot's
`fetchedAt`, never to today, so a stale snapshot cannot inflate them.
"""
import argparse
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

MIN_PEERS = 5
TITLE_AIM, TITLE_MAX = 40, 45
UNLIST_VIEWS, UNLIST_DAYS = 50, 28
MARKS = ["r01", "r02", "r05", "r10", "r30", "r50"]


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def load(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    items = data["items"] if isinstance(data, dict) else data
    fetched = parse_time(data["fetchedAt"]) if isinstance(data, dict) and data.get("fetchedAt") else None
    return items, fetched


def group_of(item):
    return "video" if item.get("type") == "premiere" else item.get("type", "video")


def age_days(item, now):
    return max((now - parse_time(item["publishedAt"])).total_seconds() / 86400, 0.0)


def band(ratio):
    """The audit's own-channel scale: how an item did against its siblings."""
    if ratio is None:
        return None
    for cut, label in ((4, "far ahead (4x+)"), (2, "ahead (2-4x)"), (1, "at or above the median"),
                       (0.5, "below the median (0.5-1x)"), (0.2, "well below (0.2-0.5x)")):
        if ratio >= cut:
            return label
    return "far below (under 0.2x)"


def pct(x):
    return None if x is None else round(x, 1)


def review(item, items, now, prev_by_id=None, prev_now=None, retention=None, min_age=7):
    group = group_of(item)
    peers = [i for i in items
             if i["id"] != item["id"] and group_of(i) == group and i.get("privacyStatus", "public") == "public"
             and age_days(i, now) >= min_age]
    views = item.get("viewCount") or 0
    age = age_days(item, now)
    pv = [i.get("viewCount") or 0 for i in peers]
    med = statistics.median(pv) if len(pv) >= MIN_PEERS else None
    ratio = round(views / med, 2) if med else None
    rank = 1 + sum(1 for v in pv if v > views)
    out = {
        "id": item["id"], "title": item["title"], "type": item.get("type"), "published": item["publishedAt"][:10],
        "age_days": round(age, 1), "views": views, "likes": item.get("likeCount"),
        "comments": item.get("commentCount"),
        "views_per_day": round(views / max(age, 1), 1),
        "likes_per_1000_views": round((item.get("likeCount") or 0) / views * 1000, 1) if views else None,
        "peers": {"group": group, "n": len(pv), "min_age_days": min_age,
                  "median_views": med, "p25": statistics.quantiles(pv, n=4)[0] if len(pv) >= MIN_PEERS else None,
                  "p75": statistics.quantiles(pv, n=4)[2] if len(pv) >= MIN_PEERS else None},
        "ratio_to_median": ratio, "band": band(ratio),
        "rank": f"{rank} of {len(pv) + 1}" if pv else None,
        "title_length": len(item["title"]),
        "title_length_check": "ok" if len(item["title"]) <= TITLE_AIM else
                              ("over the aim, within the cap" if len(item["title"]) <= TITLE_MAX else "over the 45 cap"),
    }
    if age < 7:
        out["age_note"] = "Not yet 7 days old: wait before judging; the median is for items that are at least 7 days old."
    elif age > 10:
        out["age_note"] = ("Older than 7 days: views include later growth. For a like-for-like check, compare a "
                           "snapshot taken near day 7 (--previous-inventory) with peers' gains.")
    if med is None:
        out["note"] = f"Fewer than {MIN_PEERS} comparable items at least {min_age} days old: no ratio."
    if prev_by_id is not None and item["id"] in prev_by_id and prev_now:
        days = (now - prev_now).total_seconds() / 86400
        gain = views - (prev_by_id[item["id"]].get("viewCount") or 0)
        peer_gain = [(i.get("viewCount") or 0) - (prev_by_id[i["id"]].get("viewCount") or 0)
                     for i in peers if i["id"] in prev_by_id and age_days(i, prev_now) >= min_age]
        out["since_previous_snapshot"] = {
            "days": round(days, 1), "views_gained": gain,
            "peer_median_gain": statistics.median(peer_gain) if len(peer_gain) >= MIN_PEERS else None,
            "peers_compared": len(peer_gain),
        }
    if retention and item["id"] in retention:
        mine = retention[item["id"]]
        peer_marks = {}
        for m in MARKS:
            vals = [retention[i["id"]][m] for i in items
                    if i["id"] != item["id"] and group_of(i) == group and i["id"] in retention and m in retention[i["id"]]]
            if len(vals) >= MIN_PEERS and m in mine:
                peer_marks[m] = {"this": round(mine[m] * 100), "peer_median": round(statistics.median(vals) * 100),
                                 "n": len(vals)}
        drops = [(m, peer_marks[m]["this"] - peer_marks[m]["peer_median"]) for m in peer_marks]
        out["retention_pct_of_viewers_at_mark_of_length"] = peer_marks
        if drops:
            worst = min(drops, key=lambda d: d[1])
            out["retention_largest_gap_vs_peers"] = {"mark": worst[0], "points": worst[1]}
    elif retention is not None:
        out["retention_note"] = "No retention data for this video in the file."
    return out


def unlist_candidates(items, now):
    """Public videos under 50 views and older than four weeks. Listed only; unlisting is the host's call."""
    return sorted(
        [{"id": i["id"], "title": i["title"], "views": i.get("viewCount") or 0, "age_days": round(age_days(i, now))}
         for i in items if i.get("privacyStatus", "public") == "public" and (i.get("viewCount") or 0) < UNLIST_VIEWS
         and age_days(i, now) > UNLIST_DAYS],
        key=lambda x: x["views"])


def pick(items, target, kind):
    if target:
        found = [i for i in items if i["id"] == target]
        if not found:
            raise SystemExit(f"{target}: not in the inventory")
        return found[0]
    pool = [i for i in items if group_of(i) == kind and i.get("privacyStatus", "public") == "public"]
    if not pool:
        raise SystemExit(f"no public {kind} in the inventory")
    return max(pool, key=lambda i: i["publishedAt"])


def render_md(result):
    lines = [f"# Growth review (inventory fetched {result['inventory_fetched_at'][:10]})", ""]
    rows = result["episodes"]
    lines += ["| Published | Title | Age (d) | Views | Median of peers | x median | Rank | Title chars |", "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['published']} | {r['title']} | {r['age_days']} | {r['views']} | {r['peers']['median_views']} | "
                     f"{r['ratio_to_median']} | {r['rank']} | {r['title_length']} |")
    for r in rows[:1]:
        if "since_previous_snapshot" in r:
            s = r["since_previous_snapshot"]
            lines.append(f"\nSince the previous snapshot ({s['days']} d): +{s['views_gained']} views; peer median +{s['peer_median_gain']}.")
        if "retention_pct_of_viewers_at_mark_of_length" in r:
            lines += ["", "Retention vs peers (% of viewers still watching at each mark of the video's length):"]
            lines += [f"- {m}: {v['this']}% vs {v['peer_median']}%" for m, v in r["retention_pct_of_viewers_at_mark_of_length"].items()]
    if result["unlist_candidates"]:
        lines += ["", f"Unlist candidates (under {UNLIST_VIEWS} views, over {UNLIST_DAYS} days): {len(result['unlist_candidates'])}"]
    return "\n".join(lines) + "\n"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--inventory", required=True)
    p.add_argument("--episode", help="video id; default the latest public item of --type")
    p.add_argument("--type", default="livestream", choices=["livestream", "video", "short"])
    p.add_argument("--last", type=int, default=1, help="review the last N items of --type (for the 3-4 episode lever review)")
    p.add_argument("--previous-inventory", help="an earlier snapshot of the inventory")
    p.add_argument("--retention", help="JSON {video_id: {r01: 0.94, ...}}")
    p.add_argument("--min-age", type=int, default=7, help="peers must be at least this many days old")
    p.add_argument("--format", choices=["json", "md"], default="json")
    args = p.parse_args(argv)
    items, fetched = load(args.inventory)
    if fetched is None:
        raise SystemExit("inventory has no fetchedAt; cannot age items")
    prev_items = prev_now = prev_by_id = None
    if args.previous_inventory:
        prev_items, prev_now = load(args.previous_inventory)
        prev_by_id = {i["id"]: i for i in prev_items}
        if prev_now is None or prev_now >= fetched:
            raise SystemExit("the previous snapshot must be older than the inventory")
    retention = json.loads(Path(args.retention).read_text()) if args.retention else None
    first = pick(items, args.episode, args.type)
    if args.episode or args.last == 1:
        targets = [first]
    else:
        pool = sorted([i for i in items if group_of(i) == args.type and i.get("privacyStatus", "public") == "public"],
                      key=lambda i: i["publishedAt"], reverse=True)
        targets = pool[: args.last]
    result = {
        "inventory": Path(args.inventory).name, "inventory_fetched_at": fetched.isoformat(),
        "episodes": [review(t, items, fetched, prev_by_id, prev_now, retention, args.min_age) for t in targets],
        "unlist_candidates": unlist_candidates(items, fetched),
        "caveats": [
            "Views are cumulative to the snapshot; peers are filtered by age but older items have had longer to accrue.",
            "Livestream views include the live audience.",
            "Impressions and click-through rate are not in the inventory or the Analytics API; take them from a Studio export or the Reporting API.",
        ],
    }
    if args.format == "md":
        sys.stdout.write(render_md(result))
    else:
        json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
