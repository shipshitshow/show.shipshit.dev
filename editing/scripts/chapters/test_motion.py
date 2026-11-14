"""Unit tests for the motion layer's pure logic (no ffmpeg, no Pillow, no media needed): python3 -m unittest discover -s editing/scripts/chapters"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion as m  # noqa: E402

SEGS = [(100.0, 130.0), (140.0, 170.0)]   # a 60 s chapter with a dropped span 130..140
HOSTS = [[150, 20, 370, 640], [1260, 100, 380, 560]]
FACES = {"wide": {"faces": HOSTS}, "two-up": {"two_up": [[0, 0, 960, 1080], [960, 0, 960, 1080]], "faces": HOSTS}}
WORDS = [{"w": "that", "s": 105.0, "e": 105.3}, {"w": "five", "s": 150.0, "e": 150.4},
         {"w": "videos.", "s": 150.5, "e": 151.0}, {"w": "five", "s": 160.0, "e": 160.3}, {"w": "videos", "s": 160.4, "e": 160.9}]
NOFACES = {"wide": {"faces": []}, "two-up": {"two_up": [[0, 0, 960, 1080], [960, 0, 960, 1080]], "faces": []}}


def ctx(**kw):
    base = dict(segs=SEGS, base_dir=Path("proj"), layouts=FACES, words=lambda: WORDS,
                exists=lambda p: "missing" not in str(p), asset_size=lambda p: (333, 335), asset_dur=lambda p: 4.0)
    base.update(kw)
    return m.Ctx(**base)


def build(raw, **kw):
    return m.build(raw, ctx(**kw))


def joined(msgs):
    return " | ".join(msgs)


class TimeTests(unittest.TestCase):
    def test_time_value(self):
        self.assertEqual(m.time_value(12), 12.0)
        self.assertEqual(m.time_value("1:05"), 65.0)
        self.assertEqual(m.time_value("1:00:05.5"), 3605.5)
        with self.assertRaises(ValueError):
            m.time_value("soon")
        with self.assertRaises(ValueError):
            m.time_value(True)

    def test_snap_lands_on_a_whole_frame(self):
        for t in (0.0, 1.234, 59.999):
            self.assertAlmostEqual(m.snap(t) * m.FPS, round(m.snap(t) * m.FPS), places=6)

    def test_locate_maps_through_the_kept_segments(self):
        self.assertEqual(m.locate(SEGS, 105, 110)[:2], (5.0, 10.0))
        a, b, _ = m.locate(SEGS, 150, 155)
        self.assertEqual((a, b), (40.0, 45.0))      # 30 s of the first piece + 10 s into the second

    def test_locate_rejects_dropped_span_chapter_end_and_cut_crossing(self):
        self.assertIsNone(m.locate(SEGS, 132, 136)[0])
        self.assertIsNone(m.locate(SEGS, 171, 175)[0])
        self.assertIsNone(m.locate(SEGS, 90, 95)[0])
        self.assertIn("crosses a cut", m.locate(SEGS, 128, 142)[2])


class WordTests(unittest.TestCase):
    def test_phrase_ignores_punctuation_and_case(self):
        hits = m.find_phrase(WORDS, "Five Videos", None, 100, 170)
        self.assertEqual(hits, [(150.0, 151.0), (160.0, 160.9)])

    def test_phrase_nearest_first_and_bounded_by_the_chapter(self):
        self.assertEqual(m.find_phrase(WORDS, "five videos", 161, 100, 170)[0], (160.0, 160.9))
        self.assertEqual(m.find_phrase(WORDS, "five videos", None, 155, 170), [(160.0, 160.9)])
        self.assertEqual(m.find_phrase(WORDS, "never said", None, 100, 170), [])


class ParseTests(unittest.TestCase):
    def test_no_motion_is_empty_and_clean(self):
        self.assertEqual(build(None), ([], [], []))
        self.assertEqual(build([]), ([], [], []))

    def test_valid_timeline_sorts_by_chapter_time(self):
        items, errs, _ = build([
            {"type": "pop", "keyword": "five videos", "near": 150, "color": "red", "text": "5 VIDEOS", "center": [960, 300]},
            {"type": "mascot", "asset": "claude.png", "at": 106, "dur": 4, "corner": "bl"},
            {"type": "broll", "mode": "cutaway", "asset": "b.mp4", "at": 120, "dur": 4},
        ])
        self.assertEqual(errs, [])
        self.assertEqual([i.kind for i in items], ["mascot", "broll", "pop"])
        self.assertEqual((items[0].a, items[0].b), (6.0, 10.0))

    def test_pop_window_comes_from_the_word_timings(self):
        items, errs, _ = build([{"type": "pop", "keyword": "five videos", "near": 150, "text": "5", "center": [960, 300]}])
        self.assertEqual(errs, [])
        self.assertAlmostEqual(items[0].sa, 150.0)
        self.assertGreaterEqual(items[0].sb - items[0].sa, m.POP_MIN_S - 1e-6)

    def test_keyword_spoken_twice_without_near_warns(self):
        _, errs, warns = build([{"type": "pop", "keyword": "five videos", "text": "5", "center": [960, 300]}])
        self.assertEqual(errs, [])
        self.assertIn("spoken 2 times", joined(warns))

    def test_keyword_not_spoken_or_no_words_file(self):
        self.assertIn("is not spoken", joined(build([{"type": "pop", "keyword": "ten videos", "text": "x"}])[1]))
        self.assertIn("needs a \"words\" file", joined(build([{"type": "pop", "keyword": "five", "text": "x"}], words=None)[1]))

    def test_out_of_range_times(self):
        errs = joined(build([{"type": "broll", "asset": "b.mp4", "at": 300, "dur": 4}])[1])
        self.assertIn("outside the kept part", errs)
        errs = joined(build([{"type": "broll", "asset": "b.mp4", "at": 133, "dur": 4}])[1])
        self.assertIn("dropped span", errs)
        errs = joined(build([{"type": "broll", "asset": "b.mp4", "at": 168, "dur": 6}])[1])
        self.assertIn("crosses a cut or the chapter end", errs)

    def test_missing_asset_is_reported_with_the_item_index(self):
        errs = build([{"type": "mascot", "asset": "missing/claude.png", "at": 106, "dur": 4}])[1]
        self.assertEqual(len(errs), 1)
        self.assertTrue(errs[0].startswith("motion[0]:") and "missing asset file" in errs[0])

    def test_short_window_unknown_type_bad_color(self):
        self.assertIn("under 0.5 s", joined(build([{"type": "layout", "layout": "two-up", "at": 110, "dur": 0.3}])[1]))
        self.assertIn("must be one of", joined(build([{"type": "zoom", "at": 110, "dur": 2}])[1]))
        self.assertIn("brand colours", joined(build([{"type": "pop", "at": 110, "dur": 2, "text": "x", "color": "green"}])[1]))

    def test_overlapping_windows_of_the_same_kind(self):
        errs = joined(build([{"type": "mascot", "asset": "a.png", "at": 105, "dur": 4},
                             {"type": "mascot", "asset": "a.png", "at": 107, "dur": 4}])[1])
        self.assertIn("mascot windows overlap motion[0]", errs)

    def test_cutaway_may_not_be_overlapped(self):
        errs = joined(build([{"type": "broll", "mode": "cutaway", "asset": "b.mp4", "at": 110, "dur": 4},
                             {"type": "pop", "at": 111, "dur": 2, "text": "x", "center": [960, 300]}])[1])
        self.assertIn("runs over the cutaway", errs)

    def test_cutaway_share_of_runtime_warns(self):
        _, errs, warns = build([{"type": "broll", "mode": "cutaway", "asset": "b.mp4", "at": at, "dur": 4} for at in (100, 112, 124, 142)] +
                               [{"type": "broll", "mode": "cutaway", "asset": "b.mp4", "at": 150, "dur": 4}])
        self.assertEqual(errs, [])
        self.assertIn("hosts must be on screen at least 80%", joined(warns))

    def test_short_gap_between_layouts(self):
        lay = {"c": {"crop": [0, 0, 960, 540], "owner_approved": True, "faces": [[0, 0, 100, 100]]}}
        _, errs, _ = build([{"type": "layout", "layout": "two-up", "at": 105, "dur": 3},
                            {"type": "layout", "layout": "two-up", "at": 108.3, "dur": 3}])
        self.assertIn("between two layouts", joined(errs))
        self.assertTrue(lay)


class SafeZoneTests(unittest.TestCase):
    def test_geometry_helpers(self):
        self.assertTrue(m.intersects((0, 0, 10, 10), (5, 5, 15, 15)))
        self.assertFalse(m.intersects((0, 0, 10, 10), (10, 0, 20, 10)))
        self.assertTrue(m.inside((5, 5, 8, 8), (0, 0, 10, 10)))
        self.assertFalse(m.inside((5, 5, 12, 8), (0, 0, 10, 10)))

    def test_overlay_over_a_face_is_an_error(self):
        errs = joined(build([{"type": "broll", "mode": "overlay", "asset": "b.mp4", "at": 110, "dur": 3, "box": [1300, 200, 300, 170]}])[1])
        self.assertIn("covers a host's face", errs)

    def test_overlay_on_the_free_seam_passes(self):
        errs = build([{"type": "broll", "mode": "overlay", "asset": "b.mp4", "at": 110, "dur": 3, "box": [700, 250, 480, 270]}])[1]
        self.assertEqual(errs, [])

    def test_margin_asterisk_and_lower_third(self):
        for box, word in (([40, 300, 200, 100], "safe margin"), ([1690, 100, 100, 100], "asterisk"), ([700, 900, 300, 100], "lower-third")):
            errs = joined(build([{"type": "broll", "mode": "overlay", "asset": "b.mp4", "at": 110, "dur": 3, "box": box}], layouts=NOFACES)[1])
            self.assertIn(word, errs, box)

    def test_mascot_corner_stays_in_the_safe_zone(self):
        items, errs, _ = build([{"type": "mascot", "asset": "claude.png", "at": 110, "dur": 4, "corner": "br", "width": 200}], layouts=NOFACES)
        self.assertEqual(errs, [])
        r = items[0].rect
        self.assertTrue(m.inside(r, m.SAFE))
        self.assertFalse(m.intersects(r, m.LOWER_BAND))

    def test_mascot_over_a_face_is_an_error(self):
        errs = joined(build([{"type": "mascot", "asset": "claude.png", "at": 110, "dur": 4, "corner": "bl", "width": 300}])[1])
        self.assertIn("covers a host's face", errs)

    def test_pop_off_the_seam_is_an_error(self):
        errs = joined(build([{"type": "pop", "at": 110, "dur": 2, "text": "5 VIDEOS", "center": [260, 300]}])[1])
        self.assertIn("covers a host's face", errs)

    def test_layout_without_faces_warns_instead_of_guessing(self):
        _, errs, warns = build([{"type": "pop", "at": 110, "dur": 2, "text": "x", "center": [960, 300]}], layouts={})
        self.assertEqual(errs, [])
        self.assertIn("no \"faces\" rects", joined(warns))

    def test_pop_and_mascot_may_not_cover_each_other(self):
        errs = joined(build([{"type": "mascot", "asset": "claude.png", "at": 110, "dur": 4, "corner": "tl", "width": 120},
                             {"type": "pop", "at": 111, "dur": 2, "text": "x", "center": [150, 150], "size": 40}],
                            layouts=NOFACES)[1])
        self.assertIn("covers motion[0]", errs)


class LayoutTests(unittest.TestCase):
    def test_closeup_needs_owner_approval(self):
        lay = dict(FACES, closeup={"crop": [0, 0, 960, 540], "faces": [[0, 0, 1920, 1080]]})
        errs = joined(build([{"type": "layout", "layout": "closeup", "at": 105, "dur": 4}], layouts=lay)[1])
        self.assertIn("no zoom on people", errs)
        lay["closeup"]["owner_approved"] = True
        _, errs, warns = build([{"type": "layout", "layout": "closeup", "at": 105, "dur": 4}], layouts=lay)
        self.assertEqual(errs, [])
        self.assertIn("accepted by the owner", joined(warns))

    def test_narrow_two_up_crop_is_a_zoom_and_needs_owner_approval(self):
        lay = dict(FACES, tight={"two_up": [[100, 100, 720, 810], [1100, 100, 720, 810]], "faces": HOSTS})
        item = [{"type": "layout", "layout": "tight", "at": 105, "dur": 4}]
        self.assertIn("no zoom on people", joined(build(item, layouts=lay)[1]))
        lay["tight"]["owner_approved"] = True
        self.assertEqual(build(item, layouts=lay)[1], [])
        # full half-frame crops are not a zoom, so the stock two-up needs no approval
        self.assertEqual(build([{"type": "layout", "layout": "two-up", "at": 105, "dur": 4}])[1], [])

    def test_closeup_crop_must_be_16_9_and_in_frame(self):
        lay = {"closeup": {"crop": [0, 0, 800, 800], "owner_approved": True}}
        errs = joined(build([{"type": "layout", "layout": "closeup", "at": 105, "dur": 4}], layouts=lay)[1])
        self.assertIn("16:9", errs)

    def test_unknown_layout_and_the_plate_itself(self):
        self.assertIn("is not defined", joined(build([{"type": "layout", "layout": "nope", "at": 105, "dur": 4}])[1]))
        _, errs, warns = build([{"type": "layout", "layout": "wide", "at": 105, "dur": 4}])
        self.assertEqual(errs, [])
        self.assertIn("changes nothing", joined(warns))

    def test_short_layout_windows_warn(self):
        _, errs, warns = build([{"type": "layout", "layout": "two-up", "at": 105, "dur": 1}])
        self.assertEqual(errs, [])
        self.assertIn("calm cutting", joined(warns))


class KeyAndGraphTests(unittest.TestCase):
    LEGACY = ("[0:v]trim=0.0000:30.0000,setpts=PTS-STARTPTS,fps=60,scale=-2:720:flags=lanczos,setsar=1,format=yuv420p[v0]",
              "[0:v]trim=40.0000:70.0000,setpts=PTS-STARTPTS,fps=60,scale=-2:720:flags=lanczos,setsar=1,format=yuv420p[v1]",
              "[v0][v1]concat=n=2:v=1:a=0[v]")

    def test_plain_graph_is_the_legacy_graph(self):
        parts, labels = m.base_parts(SEGS, 100.0, 720, 60)
        parts.append(m.concat_part(labels, "v"))
        self.assertEqual(tuple(parts), self.LEGACY)

    def test_key_is_unchanged_without_motion_and_changes_with_it(self):
        base = {"v": 2, "segs": SEGS}
        self.assertIs(m.key_payload(base, [], lambda p: [str(p)]), base)
        items = build([{"type": "layout", "layout": "two-up", "at": 105, "dur": 4}])[0]
        keyed = m.key_payload(base, items, lambda p: [str(p)])
        self.assertIn("motion", keyed)
        self.assertEqual(m.key_payload(base, items, lambda p: [str(p)]), keyed)
        self.assertEqual(keyed["motion"]["items"][0]["a"], 5.0)

    def graph(self, raw, **kw):
        items, errs, _ = build(raw, **kw)
        self.assertEqual(errs, [])
        for i in items:
            if i.kind == "pop":
                i.asset = Path("pop.png")
        return m.motion_parts(SEGS, 100.0, 720, 60, items)

    def test_every_kind_builds_one_graph_ending_in_v(self):
        inputs, parts = self.graph([
            {"type": "layout", "layout": "two-up", "at": 102, "dur": 4},
            {"type": "broll", "mode": "overlay", "asset": "b.mp4", "at": 110, "dur": 3, "box": [700, 250, 480, 270]},
            {"type": "mascot", "asset": "claude.png", "at": 115, "dur": 4, "corner": "bl", "width": 120},
            {"type": "pop", "at": 122, "dur": 2, "text": "5", "center": [960, 300]},
            {"type": "broll", "mode": "cutaway", "asset": "c.mp4", "at": 150, "dur": 4},
        ], layouts=NOFACES)
        g = ";".join(parts)
        self.assertEqual(len(inputs), 4)                      # overlay b-roll, mascot, pop, cutaway
        self.assertTrue(g.endswith("[v]"))
        self.assertEqual(g.count("overlay="), 5)              # layout, b-roll, mascot, pop, cutaway
        self.assertIn("hstack=inputs=2", g)
        self.assertIn("enable='gte(t,2)*lt(t,6)'", g)         # layout window in chapter time
        self.assertIn("concat=n=2:v=1:a=0[base]", g)

    def test_brand_rules_are_in_the_graph(self):
        _, parts = self.graph([
            {"type": "layout", "layout": "two-up", "at": 102, "dur": 4},
            {"type": "mascot", "asset": "claude.png", "at": 115, "dur": 4, "corner": "bl", "width": 120},
            {"type": "pop", "at": 122, "dur": 2, "text": "5", "center": [960, 300]},
        ], layouts=NOFACES)
        g = ";".join(parts)
        for banned in ("fade", "zoompan", "xfade", "blend"):
            self.assertNotIn(banned, g)                       # hard cuts only; no zoom on the cams
        self.assertEqual(g.count("trim="), 4)                 # plate pieces plus the layout pieces, nothing else is cut

    def test_every_overlay_is_gated_to_its_window(self):
        _, parts = self.graph([{"type": "mascot", "asset": "claude.png", "at": 115, "dur": 4, "corner": "br", "width": 120},
                               {"type": "pop", "at": 122, "dur": 2, "text": "5", "center": [960, 300]}], layouts=NOFACES)
        for p in parts:
            if "overlay=" in p:
                self.assertIn("enable='", p)
                self.assertIn("eof_action=pass", p)

    def test_scaling_to_1080_keeps_even_sizes(self):
        items = build([{"type": "mascot", "asset": "claude.png", "at": 115, "dur": 4, "corner": "bl", "width": 233}], layouts=NOFACES)[0]
        _, parts = m.motion_parts(SEGS, 100.0, 1080, 60, items)
        g = ";".join(parts)
        w = int(g.split("scale=")[1].split(":")[0])
        self.assertEqual(w % 2, 0)

    def test_input_args_bound_looped_stills_and_seek_videos(self):
        img = m.Item("broll", 0, 0, 1, a=2.0, b=5.0, asset=Path("a.png"))
        self.assertEqual(m.input_args(img, 60)[:2], ["-loop", "1"])
        vid = m.Item("broll", 0, 0, 1, a=2.0, b=5.0, asset=Path("a.mp4"), seek=1.5)
        self.assertEqual(m.input_args(vid, 60)[:2], ["-ss", "1.5000"])


if __name__ == "__main__":
    unittest.main()
