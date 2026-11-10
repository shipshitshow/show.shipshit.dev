import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import growth_review as g  # noqa: E402


def item(i, days_before_fetch, views, kind="livestream", title=None, privacy="public"):
    from datetime import datetime, timedelta, timezone
    fetched = datetime(2026, 11, 9, tzinfo=timezone.utc)
    return {"id": f"id{i:02d}", "title": title or f"Episode {i}", "type": kind, "privacyStatus": privacy,
            "publishedAt": (fetched - timedelta(days=days_before_fetch)).isoformat().replace("+00:00", "Z"),
            "viewCount": views, "likeCount": views // 20, "commentCount": 1}


def inventory(items, fetched="2026-11-09T00:00:00Z"):
    return {"fetchedAt": fetched, "items": items}


class GrowthReview(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        base = [item(i, 20 + i * 7, 100 + i * 10) for i in range(8)]  # 100..170 views, old
        self.items = base + [
            item(20, 9, 400, title="A very long title that goes well past the cap of forty five chars"),
            item(21, 3, 30),                                  # too young
            item(22, 40, 12, kind="video"),                   # unlist candidate, other group
            item(23, 40, 12, kind="short", privacy="unlisted"),
        ]
        self.inv = Path(self.dir.name) / "inv.json"
        self.inv.write_text(json.dumps(inventory(self.items)))

    def tearDown(self):
        self.dir.cleanup()

    def run_cli(self, *args):
        out = subprocess.run([sys.executable, "-I", str(HERE / "growth_review.py"), "--inventory", str(self.inv), *args],
                             capture_output=True, text=True, check=True).stdout
        return json.loads(out)

    def test_ratio_and_rank_against_same_type_peers(self):
        r = self.run_cli("--episode", "id20")["episodes"][0]
        self.assertEqual(r["peers"]["group"], "livestream")
        self.assertEqual(r["peers"]["n"], 8)          # the 3-day-old item is not a peer
        self.assertEqual(r["peers"]["median_views"], 135)
        self.assertAlmostEqual(r["ratio_to_median"], 2.96, places=2)
        self.assertEqual(r["band"], "ahead (2-4x)")
        self.assertEqual(r["rank"], "1 of 9")
        self.assertEqual(r["title_length_check"], "over the 45 cap")

    def test_young_item_is_flagged_not_judged_silently(self):
        r = self.run_cli("--episode", "id21")["episodes"][0]
        self.assertIn("Not yet 7 days", r["age_note"])

    def test_default_picks_latest_public_of_type(self):
        r = self.run_cli()["episodes"][0]
        self.assertEqual(r["id"], "id21")
        self.assertEqual(len(self.run_cli("--last", "3")["episodes"]), 3)

    def test_too_few_peers_gives_no_ratio(self):
        r = self.run_cli("--episode", "id22")["episodes"][0]
        self.assertIsNone(r["ratio_to_median"])
        self.assertIn("no ratio", r["note"])

    def test_unlist_candidates_are_public_and_old_only(self):
        ids = [c["id"] for c in self.run_cli()["unlist_candidates"]]
        self.assertEqual(ids, ["id22"])

    def test_previous_snapshot_gain(self):
        prev = [dict(i, viewCount=i["viewCount"] - 10) for i in self.items]
        pf = Path(self.dir.name) / "prev.json"
        pf.write_text(json.dumps(inventory(prev, "2026-11-02T00:00:00Z")))
        r = self.run_cli("--episode", "id20", "--previous-inventory", str(pf))["episodes"][0]
        self.assertEqual(r["since_previous_snapshot"]["views_gained"], 10)
        self.assertEqual(r["since_previous_snapshot"]["days"], 7.0)
        pf.write_text(json.dumps(inventory(prev, "2026-11-10T00:00:00Z")))
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_cli("--episode", "id20", "--previous-inventory", str(pf))

    def test_retention_compared_with_peers(self):
        ret = {f"id{i:02d}": {"r01": 0.9, "r05": 0.5, "r10": 0.4} for i in range(8)}
        ret["id20"] = {"r01": 0.9, "r05": 0.3, "r10": 0.2}
        rf = Path(self.dir.name) / "ret.json"
        rf.write_text(json.dumps(ret))
        r = self.run_cli("--episode", "id20", "--retention", str(rf))["episodes"][0]
        self.assertEqual(r["retention_pct_of_viewers_at_mark_of_length"]["r05"], {"this": 30, "peer_median": 50, "n": 8})
        self.assertEqual(r["retention_largest_gap_vs_peers"], {"mark": "r05", "points": -20})

    def test_markdown(self):
        out = subprocess.run([sys.executable, "-I", str(HERE / "growth_review.py"), "--inventory", str(self.inv),
                              "--last", "2", "--format", "md"], capture_output=True, text=True, check=True).stdout
        self.assertIn("| Published | Title |", out)


if __name__ == "__main__":
    unittest.main()
