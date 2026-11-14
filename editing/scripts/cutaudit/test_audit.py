"""Unit tests for the pure logic of audit.py: word overlap, edge and join classification, repeat detection,
nudge search, adapters and a synthetic mid-word cut. Run: python3 -m unittest discover -s editing/scripts/cutaudit"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import audit as A  # noqa: E402

T = A.T
QUIET, LOUD = -60.0, -20.0


def env_of(*segs):
    """Envelope from (seconds, dB) pairs, 5 ms frames."""
    db = []
    for secs, level in segs:
        db += [level] * int(round(secs / T.HOP))
    return T.Env(db)


def w(i, s, e, text):
    return T.Word(i, s, e, text, T.norm(text))


def ctx_of(env, words, quiet=-40.0):
    return A.Ctx(env, quiet, words)


# 0-1 s quiet, 1.0-1.5 "hello", 1.5-2.0 quiet, 2.0-2.5 "world", 2.5-3.5 quiet
ENV = env_of((1.0, QUIET), (0.5, LOUD), (0.5, QUIET), (0.5, LOUD), (1.0, QUIET))
WORDS = [w(0, 1.0, 1.5, "hello"), w(1, 2.0, 2.5, "world")]


class Inside(unittest.TestCase):
    def test_mid_word_reported_with_margins(self):
        c = ctx_of(ENV, WORDS)
        ins = c.inside(1.25)
        self.assertEqual(ins[0]["word"], "hello")
        self.assertEqual((ins[0]["in_ms"], ins[0]["left_ms"]), (250, 250))

    def test_tolerance_at_the_edges(self):
        c = ctx_of(ENV, WORDS)
        self.assertEqual(c.inside(1.0), [])
        self.assertEqual(c.inside(1.01), [])       # within 15 ms of the start
        self.assertEqual(c.inside(1.49), [])       # within 15 ms of the end
        self.assertTrue(c.inside(1.05))

    def test_gap_is_outside(self):
        self.assertEqual(ctx_of(ENV, WORDS).inside(1.75), [])

    def test_box_follows_energy_not_stretched_stamp(self):
        # whisper stamps "hello" to 1.9 (stretched over the pause): the box still ends where the energy does
        words = [w(0, 1.0, 1.9, "hello"), w(1, 2.0, 2.5, "world")]
        c = ctx_of(ENV, words)
        self.assertEqual(c.inside(1.75), [])
        box = next(b for b in c.boxes if b.text == "hello")
        self.assertAlmostEqual(box.e, 1.5, places=2)


class Edge(unittest.TestCase):
    def test_cut_in_pause_passes(self):
        c = ctx_of(ENV, WORDS)
        m = A.measure_edge(c, 1.75, "in")
        self.assertEqual(A.classify_edge(m, A.FADE), [])

    def test_cut_mid_word_fails(self):
        c = ctx_of(ENV, WORDS)
        for side in ("in", "out"):
            m = A.measure_edge(c, 1.25, side)
            iss = A.classify_edge(m, A.FADE)
            self.assertEqual(iss[0]["code"], "mid-word")
            self.assertEqual(iss[0]["level"], "FAIL")
            self.assertIn("hello", iss[0]["detail"])

    def test_clipped_onset_with_fade_fails(self):
        # cut-in 10 ms before the word's energy and the word box starts at the cut: the 18 ms fade eats it
        c = ctx_of(ENV, WORDS)
        m = A.measure_edge(c, 0.995, "in")
        iss = A.classify_edge(m, A.FADE)
        self.assertEqual(iss[0]["code"], "clipped-edge")

    def test_tight_pad_warns_without_fade_overlap(self):
        c = ctx_of(ENV, WORDS)
        m = A.measure_edge(c, 0.97, "in")      # 30 ms of quiet before the word: fade ok, pad under 38 ms
        iss = A.classify_edge(m, A.FADE)
        self.assertEqual([i["code"] for i in iss], ["tight-pad"])
        self.assertEqual(iss[0]["level"], "WARN")

    def test_edge_on_speech_without_fade_is_click_risk(self):
        env = env_of((1.0, LOUD), (1.0, QUIET))
        c = ctx_of(env, [w(0, 0.0, 1.0, "yes")])
        m = A.measure_edge(c, 0.0 + 0.5, "in")
        self.assertEqual(A.classify_edge(m, 0.0)[0]["level"], "FAIL")      # inside a word, speech runs through

    def test_unexplained_speech_energy_is_mid_speech(self):
        c = ctx_of(ENV, [])                     # no transcript words at all
        m = A.measure_edge(c, 1.25, "in")
        self.assertEqual(A.classify_edge(m, A.FADE)[0]["code"], "mid-speech")

    def test_quiet_dip_inside_word_fails_only_when_deep(self):
        # a 60 ms dip in the middle of one word (stop closure): split word, deep inside -> FAIL
        env = env_of((1.0, QUIET), (0.3, LOUD), (0.06, QUIET), (0.3, LOUD), (1.0, QUIET))
        c = ctx_of(env, [w(0, 1.0, 1.66, "attack")])
        m = A.measure_edge(c, 1.33, "in")
        # the word box ends at the dip and a second starts after, so word-level overlap is what must catch it
        self.assertTrue(m["kept_pad"] >= 0.0)
        iss = A.classify_edge({**m, "inside": [{"word": "attack", "in_ms": 330, "left_ms": 330}], "continuous": False,
                               "kept_pad": 0.06}, A.FADE)
        self.assertEqual(iss[0]["code"], "quiet-in-word")
        self.assertEqual(iss[0]["level"], "FAIL")
        shallow = A.classify_edge({**m, "inside": [{"word": "attack", "in_ms": 30, "left_ms": 600}], "continuous": False,
                                   "kept_pad": 0.06}, A.FADE)
        self.assertEqual(shallow[0]["level"], "WARN")


class Repeat(unittest.TestCase):
    def test_doubled_word(self):
        self.assertEqual(A.find_repeat(["we", "ship", "the"], ["the", "thing"]), (1, 0))

    def test_doubled_phrase(self):
        self.assertEqual(A.find_repeat(["so", "ship", "the", "thing"], ["ship", "the", "thing", "today"]), (3, 0))

    def test_restart_within_four_words(self):
        n, off = A.find_repeat(["we", "should", "ship", "the", "new"], ["we", "should", "ship", "it"])
        self.assertEqual((n, off), (3, 2))

    def test_no_repeat(self):
        self.assertEqual(A.find_repeat(["a", "b", "c"], ["d", "e"]), (0, 0))

    def test_empty(self):
        self.assertEqual(A.find_repeat([], ["a"]), (0, 0))
        self.assertEqual(A.find_repeat(["a"], []), (0, 0))

    def test_single_word_restart_ignored(self):
        # one shared word a few words earlier is ordinary speech, not a restart
        self.assertEqual(A.find_repeat(["the", "big", "red", "dog"], ["the", "cat"]), (0, 0))


class Join(unittest.TestCase):
    def codes(self, *a):
        return [(i["level"], i["code"]) for i in A.classify_join(*a)]

    def test_clean_join(self):
        self.assertEqual(self.codes(0.1, 0.1, ["a", "b"], ["c", "d"]), [])

    def test_double_pause_warn_and_fail(self):
        self.assertEqual(self.codes(0.35, 0.35, ["a"], ["b"]), [("WARN", "double-pause")])
        self.assertEqual(self.codes(0.6, 0.6, ["a"], ["b"]), [("FAIL", "double-pause")])

    def test_one_sided_long_pause_is_not_a_double(self):
        self.assertEqual(self.codes(1.5, 0.05, ["a"], ["b"]), [("WARN", "long-pause")])
        self.assertEqual(self.codes(0.5, 0.05, ["a"], ["b"]), [])

    def test_duplicate_phrase_across_join(self):
        self.assertEqual(self.codes(0.1, 0.1, ["so", "ship", "the", "thing"], ["ship", "the", "thing", "now"]),
                         [("FAIL", "duplicate-phrase")])

    def test_doubled_word_warns(self):
        self.assertEqual(self.codes(0.1, 0.1, ["we", "the"], ["the", "plan"]), [("WARN", "doubled-word")])

    def test_filler_at_join(self):
        self.assertEqual(self.codes(0.1, 0.1, ["so", "um"], ["we", "go"]), [("WARN", "filler-at-join")])
        self.assertEqual(self.codes(0.1, 0.1, ["so"], ["umm", "we"]), [("WARN", "filler-at-join")])


class Nudge(unittest.TestCase):
    def test_mid_word_cut_moves_to_nearest_gap_when_in_range(self):
        # cut 60 ms inside "hello" (ends 1.5): nearest quiet frame outside the word is the word end plus pad
        c = ctx_of(ENV, WORDS)
        tt = A.find_nudge(c, 1.45, "out")
        self.assertIsNotNone(tt)
        self.assertGreaterEqual(tt, 1.5)
        self.assertLessEqual(abs(tt - 1.45), A.NUDGE_RANGE + 1e-9)
        self.assertEqual(c.inside(tt), [])
        self.assertGreaterEqual(c.pad(tt, -1), A.MIN_PAD)

    def test_none_when_word_too_long(self):
        c = ctx_of(ENV, WORDS)
        self.assertIsNone(A.find_nudge(c, 1.25, "out"))

    def test_does_not_cross_another_word(self):
        # two words 40 ms apart: a cut in the first may not hop into/over the second
        env = env_of((0.5, QUIET), (0.3, LOUD), (0.04, QUIET), (0.3, LOUD), (0.5, QUIET))
        words = [w(0, 0.5, 0.8, "one"), w(1, 0.84, 1.14, "two")]
        c = ctx_of(env, words)
        tt = A.find_nudge(c, 0.7, "out")
        if tt is not None:
            self.assertLessEqual(tt, 0.8 + 1e-6)

    def test_nudge_verdict_after_is_checked(self):
        c = ctx_of(ENV, WORDS)
        res = [{"id": "j001", "sequence": "main", "kind": "join", "piece": 0,
                "out": {"t": 1.45, "side": "out", "issues": [{"level": "FAIL", "code": "mid-word", "detail": ""}]}}]
        n = A.add_nudges(res, c, {"j001:out": A.FADE})
        self.assertEqual(n, 1)
        self.assertEqual(res[0]["out"]["nudge"]["verdict_after"], "PASS")


class Audit(unittest.TestCase):
    def test_synthetic_mid_word_cut_is_caught(self):
        c = ctx_of(ENV, WORDS)
        seq = A.Sequence("main", [[0.0, 1.25], [2.0, 3.5]])
        res = A.audit_sequences([seq], c, 3.5)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["verdict"], "FAIL")
        self.assertIn("mid-word", [i["code"] for i in res[0]["issues"]])
        self.assertEqual(res[0]["words_before"], [])      # "hello" is cut, so no whole word survives before it

    def test_clean_cut_in_the_pause_passes(self):
        c = ctx_of(ENV, WORDS)
        seq = A.Sequence("main", [[0.0, 1.7], [1.85, 3.5]])
        res = A.audit_sequences([seq], c, 3.5)
        self.assertEqual(res[0]["verdict"], "PASS")
        self.assertEqual(res[0]["words_before"], ["hello"])
        self.assertEqual(res[0]["words_after"], ["world"])

    def test_head_and_tail_edges_audited_unless_at_range_ends(self):
        c = ctx_of(ENV, WORDS)
        seq = A.Sequence("main", [[1.2, 1.7], [1.85, 2.3]])
        res = A.audit_sequences([seq], c, 3.5)
        kinds = [r["kind"] for r in res]
        self.assertEqual(kinds, ["head", "join", "tail"])
        self.assertEqual(res[0]["verdict"], "FAIL")      # head at 1.2 is inside hello
        self.assertEqual(res[2]["verdict"], "FAIL")      # tail at 2.3 is inside world

    def test_multi_sequence_ids_are_prefixed(self):
        c = ctx_of(ENV, WORDS)
        seqs = [A.Sequence("a", [[0.0, 1.7], [1.85, 3.5]], skip_head=True, skip_tail=True),
                A.Sequence("b", [[0.0, 1.7], [1.85, 3.5]], skip_head=True, skip_tail=True)]
        res = A.audit_sequences(seqs, c, 3.5)
        self.assertEqual([r["id"] for r in res], ["a/j001", "b/j001"])

    def test_summary_counts(self):
        s = A.summarize([{"verdict": "PASS", "issues": []}, {"verdict": "FAIL", "issues": [{"level": "FAIL", "code": "mid-word"}]},
                         {"verdict": "WARN", "issues": [{"level": "WARN", "code": "tight-pad"}]}])
        self.assertEqual((s["cuts"], s["pass"], s["warn"], s["fail"]), (3, 1, 1, 1))
        self.assertEqual(A.summary_line(s), "Cut audit: 3 cuts: 1 PASS, 1 WARN, 1 FAIL")


class Adapters(unittest.TestCase):
    def test_trim_edl(self):
        edl = {"schema": "shipshitshow.trim-edl/1", "range": {"start": 0.0, "end": 10.0},
               "keep": [{"start": 0.0, "end": 3.0, "out_start": 0.0}, {"start": 4.0, "end": 10.0, "out_start": 3.0}],
               "cuts": [{"id": "c001", "start": 3.0, "end": 4.0}], "totals": {}}
        self.assertEqual(A.detect_format(edl), "trim")
        seq = A.load_sequences(edl, "trim")[0]
        self.assertEqual(seq.pieces, [[0.0, 3.0], [4.0, 10.0]])
        self.assertEqual(seq.ids, ["c001"])
        self.assertTrue(seq.skip_head and seq.skip_tail)

    def test_short_json(self):
        short = {"segs": [{"a": 10.0, "b": 20.5}, {"a": "1:00", "b": "1:05"}]}
        self.assertEqual(A.detect_format(short), "short")
        self.assertEqual(A.load_sequences(short, "short")[0].pieces, [[10.0, 20.5], [60.0, 65.0]])

    def test_chapters_with_drops(self):
        ch = {"chapters": [{"id": "ch1", "start": 0, "end": 100, "drop": [[10, 20], [50, 55]]}, {"id": "ch2", "start": 100, "end": 120}]}
        self.assertEqual(A.detect_format(ch), "chapters")
        seqs = A.load_sequences(ch, "chapters")
        self.assertEqual(seqs[0].pieces, [[0, 10], [20, 50], [55, 100]])
        self.assertEqual(seqs[1].pieces, [[100, 120]])
        self.assertEqual([s.name for s in A.load_sequences(ch, "chapters", only="ch2")], ["ch2"])

    def test_keeps_forms(self):
        self.assertEqual(A.load_sequences([[0, 1], [2, 3]], "keeps")[0].pieces, [[0.0, 1.0], [2.0, 3.0]])
        d = {"sequences": [{"name": "x", "pieces": [[0, 1]]}]}
        self.assertEqual(A.detect_format(d), "keeps")

    def test_unknown_format(self):
        with self.assertRaises(ValueError):
            A.detect_format({"hello": 1})

    def test_subtract(self):
        self.assertEqual(A.subtract(0, 10, [(2, 3), (3, 4), (9, 12)]), [[0, 2], [4, 9]])
        self.assertEqual(A.subtract(0, 10, []), [[0, 10]])

    def test_parse_time(self):
        self.assertEqual(A.parse_time("1:02:03.5"), 3723.5)
        self.assertEqual(A.parse_time(7), 7.0)

    def test_clip_words_map_back_to_source(self):
        segs = [{"a": 100.0, "b": 102.0}, {"a": 200.0, "b": 201.0}]
        words = [T.Word(0, 0.5, 1.0, "hi", "hi"), T.Word(1, 2.2, 2.6, "yo", "yo")]
        out = A.clip_words_to_source(words, segs)
        self.assertEqual([(round(x.s, 2), round(x.e, 2)) for x in out], [(100.5, 101.0), (200.2, 200.6)])


class Adjusted(unittest.TestCase):
    def test_adjusted_trim_edl_is_a_copy_with_moved_edges(self):
        edl = {"schema": "shipshitshow.trim-edl/1", "version": "v1", "range": {"start": 0.0, "end": 10.0},
               "keep": [{"start": 0.0, "end": 3.0, "out_start": 0.0}, {"start": 4.0, "end": 10.0, "out_start": 3.0}],
               "cuts": [{"id": "c001", "start": 3.0, "end": 4.0, "duration": 1.0, "out_at": 3.0}],
               "totals": {"output_duration": 9.0}, "render": {"file": "x"}}
        seqs = A.load_sequences(edl, "trim")
        res = [{"id": "c001", "sequence": "main", "kind": "join", "piece": 0,
                "out": {"nudge": {"to": 2.9}}, "in": {"nudge": None}}]
        adj = A.apply_to_pieces(seqs, res)
        out = A.adjusted_edl(edl, "trim", seqs, adj, "v1", 1)
        self.assertEqual(seqs[0].pieces[0][1], 3.0)                 # input untouched
        self.assertEqual(out["keep"][0]["end"], 2.9)
        self.assertEqual(out["cuts"][0]["start"], 2.9)
        self.assertAlmostEqual(out["cuts"][0]["duration"], 1.1)
        self.assertEqual(out["keep"][1]["out_start"], 2.9)
        self.assertFalse(out["cutaudit"]["applied"])
        self.assertIsNone(out["render"])
        self.assertEqual(edl["keep"][0]["end"], 3.0)                # original EDL object untouched

    def test_adjusted_generic_roundtrips_through_keeps_adapter(self):
        seqs = [A.Sequence("main", [[0.0, 1.0], [2.0, 3.0]])]
        out = A.adjusted_edl([[0, 1], [2, 3]], "keeps", seqs, seqs, "v1", 0)
        self.assertEqual(A.detect_format(out), "keeps")
        self.assertEqual(A.load_sequences(out, "keeps")[0].pieces, [[0.0, 1.0], [2.0, 3.0]])


class Png(unittest.TestCase):
    def test_png_rendered_when_pillow_is_present(self):
        try:
            import PIL  # noqa: F401
        except ImportError:
            self.skipTest("Pillow not installed")
        c = ctx_of(ENV, WORDS)
        edge = A.measure_edge(c, 1.25, "in")
        edge["nudge"] = None
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "x.png"
            self.assertTrue(A.render_png(p, c, edge, "test"))
            self.assertGreater(p.stat().st_size, 500)


class Report(unittest.TestCase):
    def test_report_and_json_are_serialisable(self):
        c = ctx_of(ENV, WORDS)
        res = A.audit_sequences([A.Sequence("main", [[0.0, 1.25], [2.0, 3.5]])], c, 3.5)
        A.add_nudges(res, c, {"j001:out": A.FADE, "j001:in": A.FADE})
        json.dumps(res)
        meta = {"cuts_file": "c.json", "format": "keeps", "transcript_file": "t.json", "words": 2, "media_file": "m.wav",
                "quiet_db": -40.0, "floor_db": -60.0, "speech_db": -20.0, "tolerance": 0.015}
        md = A.build_report(meta, res, A.summarize(res), {})
        self.assertIn("Cut audit: 1 cuts: 0 PASS, 0 WARN, 1 FAIL", md)
        self.assertIn("mid-word", md)
        self.assertIn("not applied", md)


if __name__ == "__main__":
    unittest.main()
