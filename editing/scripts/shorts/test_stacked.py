"""Tests for the pure logic of the stacked Shorts layout: crops, seam placement, karaoke word timing, audio fades.

Run: python3 -m unittest discover -s editing/scripts/shorts   (also run by CI through
apps/app/src/lib/__tests__/editing-shorts-python.test.ts). The two caption-image tests need Pillow and the
Arial Bold font and skip when either is missing.
"""
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import common as C  # noqa: E402
import stacked as S  # noqa: E402

CAPW = [
    [0.5, 1.5, "DO YOU BELIEVE", [["DO", 0.5], ["YOU", 0.7], ["BELIEVE", 1.0]]],
    [2.0, 3.0, "IS DEAD?", [["IS", 2.0], ["DEAD?", 2.4]]],
]


class CropSpec(unittest.TestCase):
    def test_defaults_cut_two_panels_of_the_panel_aspect(self):
        spec = S.crop_spec({})
        self.assertEqual((spec["w"], spec["h"]), (960, 853))
        self.assertAlmostEqual(spec["w"] / spec["h"], S.PANEL_W / S.PANEL_H, delta=0.01 * S.PANEL_W / S.PANEL_H)
        self.assertEqual(spec["V"][0], 0)       # Vincent on the left half of the two-shot
        self.assertEqual(spec["M"][0], 960)     # Mitchell on the right half

    def test_defaults_stay_above_the_name_labels(self):
        self.assertEqual(S.label_warnings(S.crop_spec({})), [])

    def test_override_merges_over_defaults(self):
        spec = S.crop_spec({"crops": {"S": {"M": [900, 80]}}})
        self.assertEqual(spec["M"], [900, 80])
        self.assertEqual(spec["V"], S.DEFAULT_CROPS["V"])

    def test_other_layouts_crops_are_ignored(self):
        self.assertEqual(S.crop_spec({"crops": {"A": {"tiles": {}}}}), S.crop_spec({}))

    def test_rejects_wrong_aspect(self):
        with self.assertRaises(ValueError):
            S.crop_spec({"crops": {"S": {"w": 960, "h": 540}}})

    def test_rejects_a_window_outside_the_source(self):
        with self.assertRaises(ValueError):
            S.crop_spec({"crops": {"S": {"M": [1000, 0]}}})                  # 1000 + 960 > 1920
        with self.assertRaises(ValueError):
            S.crop_spec({"crops": {"S": {"V": [0, 300]}}})                   # 300 + 853 > 1080
        with self.assertRaises(ValueError):
            S.crop_spec({"crops": {"S": {"V": [-1, 0]}}})

    def test_label_strip_warning(self):
        spec = S.crop_spec({"crops": {"S": {"V": [0, 200]}}})                # ends at y1053
        self.assertEqual(S.label_warnings(spec), ["V"])


class SeamPlacement(unittest.TestCase):
    def test_panels_fill_the_canvas_and_meet_at_the_seam(self):
        self.assertEqual(S.PANEL_H * 2, C.CANVAS[1])
        self.assertEqual(S.PANEL_W, C.CANVAS[0])
        self.assertEqual(S.SEAM_Y, 960)

    def test_caption_box_is_centred_on_the_seam(self):
        for cap_h in (62, 58, 54, 50):
            top, bottom = S.seam_caption_box(cap_h)
            self.assertEqual((top + bottom) / 2, S.SEAM_Y)
            self.assertLess(top, S.SEAM_Y)
            self.assertGreater(bottom, S.SEAM_Y)

    def test_caption_stays_clear_of_the_shorts_ui_zone(self):
        self.assertLess(S.seam_caption_box(62)[1], 1570)

    def test_asterisk_geometry_is_the_locked_one(self):
        # needs build.py's constants but not Pillow: parse them without importing build
        src = (HERE / "build.py").read_text()
        self.assertIn("AST = dict(cx=940, cy=290, size=120)", src)

    def test_piece_filter_stacks_vincent_over_mitchell(self):
        f = S.piece_filter(2, S.crop_spec({}))
        self.assertIn("[2:v]split=2[sv2][sm2]", f)
        self.assertIn("[sv2]crop=960:853:0:0,scale=1080:960", f)
        self.assertIn("[sm2]crop=960:853:960:100,scale=1080:960", f)
        self.assertIn("[pv2][pm2]vstack=inputs=2,setsar=1[l2]", f)     # V first = on top
        self.assertNotIn("zoompan", f)                                  # no cam zooms


class KaraokeTiming(unittest.TestCase):
    def test_each_word_is_red_until_the_next_starts(self):
        spans = S.karaoke_spans(CAPW[0][3], CAPW[0][1])
        self.assertEqual(spans, [(0.5, 0.7, 0), (0.7, 1.0, 1), (1.0, 1.5, 2)])

    def test_spans_are_contiguous_and_end_with_the_chunk(self):
        for a, b, _, ws in CAPW:
            spans = S.karaoke_spans(ws, b)
            self.assertEqual(spans[0][0], ws[0][1])
            self.assertEqual(spans[-1][1], b)
            for prev, nxt in zip(spans, spans[1:]):
                self.assertEqual(prev[1], nxt[0])

    def test_caption_state_follows_the_word_being_spoken(self):
        self.assertEqual(S.caption_state(CAPW, 0.5), (0, 0))
        self.assertEqual(S.caption_state(CAPW, 0.69), (0, 0))
        self.assertEqual(S.caption_state(CAPW, 0.7), (0, 1))
        self.assertEqual(S.caption_state(CAPW, 1.49), (0, 2))
        self.assertEqual(S.caption_state(CAPW, 2.5), (1, 1))

    def test_no_caption_in_the_gaps(self):
        self.assertIsNone(S.caption_state(CAPW, 0.2))
        self.assertIsNone(S.caption_state(CAPW, 1.5))     # the chunk ends exactly here
        self.assertIsNone(S.caption_state(CAPW, 1.8))
        self.assertIsNone(S.caption_state(CAPW, 3.0))

    def test_exactly_one_word_is_red_and_the_rest_white(self):
        colours = S.word_colors("do you believe", 1)
        self.assertEqual(colours, [("DO", "white"), ("YOU", "red"), ("BELIEVE", "white")])
        for k in range(3):
            self.assertEqual([c for _, c in S.word_colors("a b c", k)].count("red"), 1)

    def test_brand_red_is_the_locked_value(self):
        self.assertIn("RED = (232, 59, 59, 255)", (HERE / "build.py").read_text())   # #E83B3B


class AudioFades(unittest.TestCase):
    def test_fades_only_at_joins_between_segs(self):
        self.assertEqual(C.audio_fades(0, 0, 5.0, 3), ["afade=t=out:st=4.982:d=0.018"])
        self.assertEqual(
            C.audio_fades(1, 1, 5.0, 3), ["afade=t=in:st=0:d=0.018", "afade=t=out:st=4.982:d=0.018"])
        self.assertEqual(C.audio_fades(2, 2, 5.0, 3), ["afade=t=in:st=0:d=0.018"])

    def test_single_seg_has_no_fades(self):
        self.assertEqual(C.audio_fades(0, 0, 5.0, 1), [])

    def test_opening_fade_only_on_the_first_seg(self):
        self.assertEqual(C.audio_fades(0, 0, 5.0, 1, 0.05), ["afade=t=in:st=0:d=0.05"])
        self.assertEqual(C.audio_fades(1, 1, 5.0, 2, 0.05), ["afade=t=in:st=0:d=0.018"])


class LayoutGuard(unittest.TestCase):
    RUNS = [
        {"layout": "O", "start_s": 0.0, "end_s": 31.0},
        {"layout": "S", "start_s": 31.0, "end_s": 300.0},
        {"layout": "X", "start_s": 300.0, "end_s": 900.0},
    ]

    def test_two_shot_segs_pass(self):
        self.assertEqual(S.layout_warnings(self.RUNS, [{"a": 40.0, "b": 70.0}]), [])

    def test_segs_in_other_layouts_are_reported(self):
        got = S.layout_warnings(self.RUNS, [{"a": 290.0, "b": 310.0}, {"a": 5.0, "b": 10.0}])
        self.assertEqual(got, [(300.0, 310.0, "X"), (5.0, 10.0, "O")])


def _caption_deps():
    try:
        from PIL import Image  # noqa: F401
        import build as B
    except ImportError:
        return None
    return B if Path(B.CAPFONT).exists() else None


@unittest.skipUnless(_caption_deps(), "needs Pillow and Arial Bold")
class CaptionImage(unittest.TestCase):
    def test_caption_line_is_centred_on_the_seam_with_one_red_word(self):
        from PIL import Image
        B = _caption_deps()
        with tempfile.TemporaryDirectory() as d:
            cap_h, top, bottom, paths = B.cap_words(f"{d}/c", "do you believe", ["do", "you", "believe"],
                                                     B.CAPFONT, cy=S.SEAM_Y)
            self.assertEqual(len(paths), 3)
            self.assertEqual((top + bottom) / 2, S.SEAM_Y)
            im = Image.open(paths[1]).convert("RGBA")
            bbox = im.getbbox()
            self.assertAlmostEqual((bbox[1] + bbox[3]) / 2, S.SEAM_Y, delta=10)
            self.assertLessEqual(bbox[2] - bbox[0], B.CAP_MAX_W + 12)
            red = [(x, y) for x in range(0, im.width, 2) for y in range(bbox[1], bbox[3], 2)
                   if im.getpixel((x, y))[:3] == B.RED[:3]]
            xs = [x for x, _ in red]
            self.assertTrue(red)
            # word 1 of 3 is the middle one: its red pixels sit in the middle third of the line
            third = (bbox[2] - bbox[0]) / 3
            self.assertGreater(min(xs), bbox[0] + third * 0.6)
            self.assertLess(max(xs), bbox[2] - third * 0.6)


if __name__ == "__main__":
    unittest.main()
