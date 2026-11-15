"""Tests for the release-package check and the shared caption safe zones.

Run: python3 -m unittest discover -s editing/scripts/package -p 'test_*.py'   (also run by CI). Stdlib only: no Pillow, no ffmpeg.
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import check as K  # noqa: E402
import safezone as Z  # noqa: E402

sys.path.insert(0, str(HERE.parent / "shorts"))
import stacked as S  # noqa: E402


def levels(items, cid):
    return [i["level"] for i in items if i["id"] == cid]


def good_package(base):
    for n in ("a.mp4", "t1.png", "t2.png", "t3.png", "x.mp4"):
        (base / n).write_bytes(b"x")
    return {
        "episode": "261111", "title": "Video Editing Is DEAD", "episode_link": "https://youtu.be/abc",
        "tweet": {"text": "Editing is not dead, the timeline is. 20 prompts of fix it and I opened the tool.",
                  "first_reply": "Full episode: https://youtu.be/abc?utm_source=x&utm_medium=social"},
        "thumbnails": ["t1.png", "t2.png", "t3.png"],
        "shorts": [{"id": f"short-0{i}", "title": f"Short {i}", "file": "a.mp4", "duration_s": 60,
                    "layout": "stacked", "captions": {"cap_h": 62, "cy": 960, "width": 760}} for i in range(1, 6)],
        "x_copy": {"file": "x.mp4", "profile": "landscape", "cap_h": 48, "cy": 872, "width": 1500},
    }


class SafeZone(unittest.TestCase):
    def test_shorts_numbers_are_read_from_the_shorts_scripts_not_copied(self):
        st = Z.PROFILES["stacked"]
        self.assertEqual(st["cy"], S.SEAM_Y)
        self.assertEqual((st["cap_h"], st["cap_h_fallbacks"], st["max_w"], st["floor"]), (62, (58, 54, 50), 780, 1248))
        self.assertEqual(Z.PROFILES["full"]["cy"], 1056)
        self.assertEqual(Z.PROFILES["stacked"]["keepouts"]["asterisk"], (760, 400, 880, 520))

    def test_shorts_zone_is_the_ad_safe_zone_for_1080x1920(self):
        # Universal Video Ad Safe Zones: 48 left, 192 right, 288 top, 672 bottom.
        for name in ("stacked", "full"):
            p = Z.PROFILES[name]
            self.assertEqual((p["x_range"], p["top"], p["floor"], p["max_words"]), ((48, 888), 288, 1248, 3), name)
            self.assertEqual(p["cx"], (48 + 888) // 2)
            self.assertEqual(Z.center_x(p), 468)
            box = Z.caption_box(p, p["cap_h"], p["max_w"])
            self.assertEqual((box[0], box[2]), (78, 858))   # 468 +/- 390: clear of the right rail from x917

    def test_old_full_frame_caption_position_is_now_a_violation(self):
        p = Z.PROFILES["full"]
        self.assertTrue(any("1248" in b for b in Z.violations(p, Z.caption_box(p, 62, 780, 1480), 1480)))   # was y1480
        self.assertTrue(any("wide" in b or "x" in b for b in Z.violations(p, Z.caption_box(p, 62, 940, 1056), 1056)))   # was 940 wide
        off = Z.caption_box(p, 62, 780, 1056)
        shifted = (off[0] + 200, off[1], off[2] + 200, off[3])                                              # not on x468
        self.assertTrue(Z.violations(p, shifted, 1056))

    def test_graphics_box_holds_the_asterisk_and_rejects_the_old_spot(self):
        self.assertEqual(Z.GRAPHICS_SAFE_BOX, (48, 400, 888, 1248))
        self.assertEqual(Z.graphics_violations(Z.PROFILES["stacked"]["keepouts"]["asterisk"]), [])
        self.assertTrue(Z.graphics_violations((880, 230, 1000, 350)))     # old spot: under the chips, clipped by the right edge
        self.assertTrue(Z.graphics_violations((0, 500, 1080, 1100)))     # a 16:9 b-roll card scaled to full width

    def test_stacked_box_matches_the_seam_helper(self):
        top, bottom = S.seam_caption_box(62)
        box = Z.caption_box(Z.PROFILES["stacked"], 62, 800)
        self.assertEqual((box[1], box[3]), (top, bottom))

    def test_defaults_of_every_profile_are_inside_their_own_zone(self):
        for name, p in Z.PROFILES.items():
            self.assertEqual(Z.violations(p, Z.caption_box(p, p["cap_h"], p["max_w"]), p["cy"]), [], name)

    def test_stacked_caption_off_the_seam_is_flagged(self):
        p = Z.PROFILES["stacked"]
        bad = Z.violations(p, Z.caption_box(p, 62, 800, 1100), 1100)
        self.assertTrue(any("seam" in b for b in bad))

    def test_full_caption_below_the_floor_is_flagged(self):
        p = Z.PROFILES["full"]
        bad = Z.violations(p, Z.caption_box(p, 62, 800, 1600), 1600)
        self.assertTrue(any("1248" in b for b in bad))

    def test_landscape_flags_faces_labels_margin_width_and_asterisk(self):
        p = Z.PROFILES["landscape"]
        self.assertTrue(any("faces" in b for b in Z.violations(p, Z.caption_box(p, 48, 1500, 700))))
        self.assertTrue(any("labels" in b for b in Z.violations(p, Z.caption_box(p, 48, 1500, 900))))
        self.assertTrue(any("margin" in b for b in Z.violations(p, Z.caption_box(p, 48, 1800))))
        self.assertTrue(any("wide" in b for b in Z.violations(p, Z.caption_box(p, 48, 1800))))
        self.assertTrue(any("asterisk" in b for b in Z.violations(p, (1700, 100, 1800, 200))))

    def test_profile_by_orientation_and_unknown_name(self):
        self.assertEqual(Z.profile_for((1920, 1080))["name"], "landscape")
        self.assertEqual(Z.profile_for((1080, 1920))["name"], "stacked")
        with self.assertRaises(ValueError):
            Z.profile_for((1, 1), "nope")


class Title(unittest.TestCase):
    def test_261111_title_passes(self):
        r = K.check_title("Video Editing Is DEAD")
        self.assertEqual({i["level"] for i in r}, {K.PASS})

    def test_length_bands(self):
        self.assertEqual(levels(K.check_title("A" * 45), "title.length"), [K.PASS])
        self.assertEqual(levels(K.check_title("A" * 48), "title.length"), [K.WARN])
        self.assertEqual(levels(K.check_title("A" * 51), "title.length"), [K.FAIL])

    def test_short_title_passes_the_vault_has_no_lower_bound(self):
        self.assertEqual(levels(K.check_title("Editing Is Dead"), "title.length"), [K.PASS])

    def test_lowercase_word_fails_and_small_word_warns(self):
        self.assertEqual(levels(K.check_title("Video editing Is Dead"), "title.case"), [K.FAIL])
        self.assertEqual(levels(K.check_title("The End of Editing"), "title.case"), [K.WARN])
        self.assertEqual(levels(K.check_title("Claude 4 Is Here: Why It Matters"), "title.case"), [K.PASS])

    def test_live_tag_and_empty_title_fail(self):
        self.assertEqual(levels(K.check_title("[LIVE] Video Editing"), "title.live"), [K.FAIL])
        self.assertEqual(levels(K.check_title("  "), "title.present"), [K.FAIL])


class Tweet(unittest.TestCase):
    TEXT = "Editing is not dead, the timeline is. 20 prompts of fix it."

    def test_good_tweet(self):
        r = K.check_tweet({"text": self.TEXT, "first_reply": "Full episode: {episode_link}"})
        self.assertNotIn(K.FAIL, {i["level"] for i in r})

    def test_missing_tweet_fails(self):
        self.assertEqual(levels(K.check_tweet(None), "tweet.present"), [K.FAIL])

    def test_length_bands(self):
        r = lambda n: levels(K.check_tweet({"text": "x" * n, "first_reply": "{episode_link}"}), "tweet.length")
        self.assertEqual((r(240), r(260), r(281)), ([K.PASS], [K.WARN], [K.FAIL]))

    def test_link_in_the_tweet_fails_and_missing_reply_fails(self):
        r = K.check_tweet({"text": self.TEXT + " https://youtu.be/abc", "first_reply": ""})
        self.assertEqual(levels(r, "tweet.link"), [K.FAIL])
        self.assertEqual(levels(r, "tweet.first_reply"), [K.FAIL])
        r = K.check_tweet({"text": self.TEXT + " {episode_link}", "first_reply": "x"})
        self.assertEqual(levels(r, "tweet.link"), [K.FAIL])

    def test_first_reply_link_rules(self):
        t = lambda reply, link="https://youtu.be/abc": levels(K.check_tweet({"text": self.TEXT, "first_reply": reply}, link), "tweet.first_reply")
        self.assertEqual(t("see https://youtu.be/abc?utm_source=x"), [K.PASS])
        self.assertEqual(t("see https://youtu.be/abc"), [K.WARN])
        self.assertEqual(t("see https://youtu.be/zzz?utm_source=x"), [K.WARN])
        self.assertEqual(t("see the episode"), [K.FAIL])

    def test_hashtags(self):
        h = lambda text: levels(K.check_tweet({"text": text, "first_reply": "{episode_link}"}), "tweet.hashtags")
        self.assertEqual(h("take 1 #VideoEditing"), [K.PASS])
        self.assertEqual(h("take 1 #AI"), [K.FAIL])
        self.assertEqual(h("take 1 #a #b #c"), [K.FAIL])

    def test_announcement_opener_and_no_receipt_warn(self):
        r = K.check_tweet({"text": "New video is out, go watch it", "first_reply": "{episode_link}"})
        self.assertEqual(levels(r, "tweet.standard"), [K.WARN])


class Package(unittest.TestCase):
    @staticmethod
    def main(argv):
        with contextlib.redirect_stdout(io.StringIO()):
            return K.main(argv)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def test_good_package_passes(self):
        rep = K.run_checks(good_package(self.base), self.base)
        self.assertEqual(rep["overall"], K.PASS, [c for c in rep["checks"] if c["level"] != K.PASS])
        self.assertTrue(rep["unspecified"])

    def test_four_shorts_and_two_thumbnails(self):
        pkg = good_package(self.base)
        pkg["shorts"].pop()
        pkg["thumbnails"].pop()
        rep = K.run_checks(pkg, self.base)
        self.assertEqual(levels(rep["checks"], "shorts.count"), [K.FAIL])
        self.assertEqual(levels(rep["checks"], "thumbnails.count"), [K.WARN])
        self.assertEqual(rep["overall"], K.FAIL)

    def test_no_thumbnails_and_missing_files_fail(self):
        pkg = good_package(self.base)
        pkg["thumbnails"] = []
        pkg["shorts"][0]["file"] = "gone.mp4"
        pkg["x_copy"]["file"] = "gone.mp4"
        rep = K.run_checks(pkg, self.base)
        self.assertEqual(levels(rep["checks"], "thumbnails.count"), [K.FAIL])
        self.assertIn(K.FAIL, levels(rep["checks"], "short.file"))
        self.assertEqual(levels(rep["checks"], "xcopy.file"), [K.FAIL])

    def test_short_duration_and_title_limits(self):
        pkg = good_package(self.base)
        pkg["shorts"][0]["duration_s"] = 30
        pkg["shorts"][1]["duration_s"] = None
        pkg["shorts"][2]["title"] = "x" * 101
        rep = K.run_checks(pkg, self.base)
        self.assertEqual(levels(rep["checks"], "short.duration")[:2], [K.WARN, K.WARN])
        self.assertIn(K.FAIL, levels(rep["checks"], "short.title"))

    def test_caption_zone_failures_and_missing_spec(self):
        pkg = good_package(self.base)
        pkg["shorts"][0]["captions"] = {"cap_h": 62, "cy": 1100, "width": 760}   # off the seam
        pkg["shorts"][1].pop("captions")                                         # unspecified
        pkg["x_copy"].update(cy=700)                                             # over the faces
        rep = K.run_checks(pkg, self.base)
        zones = [c for c in rep["checks"] if c["id"] == "captions.zone"]
        self.assertEqual([c["level"] for c in zones].count(K.FAIL), 2)
        self.assertEqual([c["level"] for c in zones].count(K.WARN), 1)

    def test_caption_chunks_over_three_words_warn_and_do_not_fail(self):
        pkg = good_package(self.base)
        pkg["shorts"][0]["captions"]["chunks"] = ["one two three", "this is four words"]
        pkg["shorts"][1]["captions"]["chunks"] = ["one two three"]
        pkg["shorts"][2]["captions"]["max_words"] = 5
        pkg["x_copy"]["chunks"] = ["a long landscape caption chunk of many words"]   # landscape has no word rule
        rep = K.run_checks(pkg, self.base)
        words = [c for c in rep["checks"] if c["id"] == "captions.words"]
        self.assertEqual([c["level"] for c in words].count(K.WARN), 2)
        self.assertEqual([c["level"] for c in words].count(K.PASS), 1)
        self.assertEqual(len(words), 3)
        self.assertNotIn(K.FAIL, [c["level"] for c in rep["checks"] if c["id"] == "captions.zone"])

    def test_measured_extent_from_the_dual_report_wins(self):
        pkg = good_package(self.base)
        (self.base / "dual-report.json").write_text(json.dumps({"captions": {"extent": [100, 700, 1800, 760]}}))
        pkg["x_copy"].update(report="dual-report.json", cy=872)   # declared values would pass; the measurement does not
        rep = K.run_checks(pkg, self.base)
        self.assertEqual(levels([c for c in rep["checks"] if c["subject"] == "X/LinkedIn copy"], "captions.zone"), [K.FAIL])

    def test_from_episode_reads_the_upload_plan(self):
        (self.base / "upload-plan.json").write_text(json.dumps({"items": [
            {"id": "main", "title": "Video Editing Is DEAD"},
            {"id": "short-01", "kind": "short", "title": "One", "file": "a.mp4"}]}))
        pkg = K.from_episode(self.base)
        self.assertEqual(pkg["title"], "Video Editing Is DEAD")
        self.assertEqual(pkg["shorts"][0]["file"], "a.mp4")
        self.assertEqual(K.from_episode(self.base / "none"), {})

    def test_cli_writes_reports_and_sets_the_exit_code(self):
        pkg = good_package(self.base)
        (self.base / "package.json").write_text(json.dumps(pkg))
        out = self.base / "out"
        self.assertEqual(self.main(["--package", str(self.base / "package.json"), "--out", str(out)]), 0)
        rep = json.loads((out / "package-check.json").read_text())
        self.assertEqual(rep["overall"], K.PASS)
        self.assertIn("## Not specified", (out / "package-check.md").read_text())
        pkg["title"] = "video editing is dead"
        (self.base / "package.json").write_text(json.dumps(pkg))
        self.assertEqual(self.main(["--package", str(self.base / "package.json"), "--out", str(out)]), 1)
        pkg["title"] = "Video Editing Is DEAD"
        pkg["tweet"]["text"] = "New video is out, go watch it"        # WARN only
        (self.base / "package.json").write_text(json.dumps(pkg))
        self.assertEqual(self.main(["--package", str(self.base / "package.json"), "--out", str(out)]), 0)
        self.assertEqual(self.main(["--package", str(self.base / "package.json"), "--out", str(out), "--strict"]), 1)


if __name__ == "__main__":
    unittest.main()
