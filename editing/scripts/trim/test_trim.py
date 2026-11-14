"""Unit tests for trim.py: pure logic on synthetic energy envelopes (no media, no ffmpeg), plus one
end-to-end render check that runs only when ffmpeg is installed.

Run: python3 -m unittest discover -s editing/scripts/trim -p 'test_*.py'
"""
from __future__ import annotations

import contextlib
import io
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import trim as t  # noqa: E402

LOUD, QUIET = -20.0, -70.0


def env_of(*segs, t0=0.0) -> t.Env:
    """segs = (seconds, dB) pairs laid end to end at 5 ms frames."""
    db: list[float] = []
    for dur, level in segs:
        db += [level] * int(round(dur / t.HOP))
    return t.Env(db, t0)


def words_of(*items) -> list[t.Word]:
    return [t.Word(i, s, e, text, t.norm(text)) for i, (s, e, text) in enumerate(items)]


def params(**kw) -> t.Params:
    return t.Params(**{"noise_db": -45.0, **kw})


def act_of(env: t.Env, thr=-45.0) -> list[bool]:
    return [d > thr for d in env.db]


class Transcript(unittest.TestCase):
    def test_whisper_cpp_words(self):
        data = {"transcription": [
            {"offsets": {"from": 0, "to": 400}, "text": ""},
            {"offsets": {"from": 400, "to": 900}, "text": " Hello,"},
            {"offsets": {"from": 900, "to": 1500}, "text": " [BLANK_AUDIO]"},
            {"offsets": {"from": 1500, "to": 1900}, "text": " world"},
        ]}
        w = t.parse_transcript(data)
        self.assertEqual([x.tok for x in w], ["hello", "world"])
        self.assertAlmostEqual(w[0].s, 0.4)
        self.assertAlmostEqual(w[1].e, 1.9)

    def test_list_forms(self):
        a = t.parse_transcript([[0.0, 0.3, "um"], [0.3, 0.8, "yes"]])
        b = t.parse_transcript([{"w": "um", "s": 0.0, "e": 0.3}, {"word": "yes", "start": 0.3, "end": 0.8}])
        self.assertEqual([x.tok for x in a], [x.tok for x in b])

    def test_phrase_level_rejected(self):
        data = {"transcription": [{"offsets": {"from": 0, "to": 3000}, "text": " this is a whole sentence here"},
                                  {"offsets": {"from": 3000, "to": 6000}, "text": " and another long one"}]}
        with self.assertRaises(ValueError):
            t.parse_transcript(data)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            t.parse_transcript([])


class Fillers(unittest.TestCase):
    def setUp(self):
        self.w = words_of((0, .3, "So"), (.3, .6, "um,"), (.6, .9, "I"), (.9, 1.2, "Uhh"), (1.2, 1.5, "like"),
                          (1.5, 1.8, "you"), (1.8, 2.1, "know"), (2.1, 2.4, "Hmm."), (2.4, 2.7, "umbrella"))

    def labels(self, hits):
        return [(h.code, h.label) for h in hits]

    def test_defaults_only_hesitations(self):
        hits = t.find_fillers(self.w)
        self.assertEqual([h.idx for h in hits], [[1], [3], [7]])
        self.assertTrue(all(h.code == "filler" for h in hits))

    def test_like_and_you_know_not_default(self):
        toks = {self.w[i].tok for h in t.find_fillers(self.w) for i in h.idx}
        self.assertNotIn("like", toks)
        self.assertNotIn("know", toks)

    def test_word_containing_filler_not_matched(self):
        self.assertNotIn(8, [i for h in t.find_fillers(self.w) for i in h.idx])

    def test_elongated_matches(self):
        self.assertIn([3], [h.idx for h in t.find_fillers(self.w)])      # Uhh -> uh

    def test_phrase(self):
        hits = t.find_fillers(self.w, phrases=[("you", "know")])
        phr = [h for h in hits if h.code == "filler-phrase"]
        self.assertEqual(len(phr), 1)
        self.assertEqual(phr[0].idx, [5, 6])

    def test_flagged_like(self):
        hits = t.find_fillers(self.w, flagged={4})
        self.assertIn(("flagged-filler", "like"), self.labels(hits))

    def test_risky_single_phrase_refused(self):
        with self.assertRaises(SystemExit):
            t.parse_phrases("like")
        self.assertEqual(t.parse_phrases("you know, I mean"), [("you", "know"), ("i", "mean")])

    def test_resolve_flags(self):
        ids, problems = t.resolve_flags(self.w, [4, {"t": 1.25, "text": "like"}, {"t": 9, "text": "x"}, 99])
        self.assertEqual(ids, {4})
        self.assertEqual(len(problems), 2)


class Envelope(unittest.TestCase):
    def test_parse_astats(self):
        text = ("frame:0 pts:0 pts_time:0\nlavfi.astats.Overall.RMS_level=-30.5\n"
                "frame:1 pts:80 pts_time:0.005\nlavfi.astats.Overall.RMS_level=-inf\n"
                "frame:2 pts:160 pts_time:0.01\nlavfi.astats.Overall.RMS_level=-12.0\n")
        e = t.parse_astats(text, 2.0)
        self.assertEqual(len(e), 3)
        self.assertEqual(e.db[1], -120.0)
        self.assertAlmostEqual(e.t(2), 2.01)
        self.assertEqual(e.idx(2.01), 2)

    def test_auto_threshold_clamped(self):
        self.assertEqual(t.auto_threshold(env_of((5, -90), (1, -10))), -45.0)      # floor very low
        self.assertEqual(t.auto_threshold(env_of((5, -25), (1, -10))), -32.0)      # noisy room
        self.assertAlmostEqual(t.auto_threshold(env_of((5, -50), (1, -10))), -38.0)

    def test_quiet_runs(self):
        self.assertEqual(t.quiet_runs([True, True, False, True, False, True]), [(0, 2), (3, 4), (5, 6)])
        self.assertEqual(t.quiet_runs([False, False]), [])

    def test_snap_boundary_prefers_lowest_energy(self):
        # quiet frames at -60 except a -80 dip at 1.02-1.03 s
        e = env_of((1.0, QUIET), (0.01, -60), (0.01, -80), (0.01, -60), (1.0, QUIET))
        e.db[e.idx(1.02)] = -80
        act = act_of(e)
        b = t.snap_boundary(e, act, 1.0, 0.95, 1.1, 0.06)
        self.assertIsNotNone(b)
        self.assertLess(abs(b - 1.02), 0.011)

    def test_snap_boundary_none_when_loud(self):
        e = env_of((1.0, LOUD))
        self.assertIsNone(t.snap_boundary(e, act_of(e), 0.5, 0.4, 0.6, 0.06))


class Planning(unittest.TestCase):
    def talk_pause_talk(self, pause):
        e = env_of((1.0, LOUD), (pause, QUIET), (1.0, LOUD))
        w = words_of((0.0, 1.0 + pause * 0.9, "hello"), (1.0 + pause, 2.0 + pause, "world"))   # whisper stretches word 1
        return e, w

    def test_dead_air_leaves_breath(self):
        e, w = self.talk_pause_talk(1.2)
        cuts, refused, _ = t.plan(w, e, params(), [])
        self.assertEqual(len(cuts), 1)
        self.assertEqual(refused, [])
        c = cuts[0]
        self.assertEqual(c.reasons, {"dead-air"})
        self.assertAlmostEqual(c.dur, 1.2 - 0.25, delta=0.04)
        # cut sits inside the pause with quiet margins, never in speech
        self.assertGreaterEqual(c.start, 1.0 + t.MIN_PAD - 1e-6)
        self.assertLessEqual(c.end, 2.2 - t.MIN_PAD + 1e-6)

    def test_pause_below_threshold_kept(self):
        e, w = self.talk_pause_talk(0.5)
        cuts, refused, _ = t.plan(w, e, params(), [])
        self.assertEqual((cuts, refused), ([], []))

    def test_threshold_configurable(self):
        e, w = self.talk_pause_talk(0.5)
        cuts, _, _ = t.plan(w, e, params(min_silence=0.4, breath=0.2), [])
        self.assertEqual(len(cuts), 1)
        self.assertAlmostEqual(cuts[0].dur, 0.3, delta=0.04)

    def test_edges_are_quiet_frames(self):
        e, w = self.talk_pause_talk(1.5)
        cuts, _, _ = t.plan(w, e, params(), [])
        act = act_of(e)
        for c in cuts:
            for edge in (c.start, c.end):
                k = e.idx(edge)
                self.assertFalse(act[k - 1] or act[k])

    def test_filler_cut_on_its_burst(self):
        # speech, 0.1 s gap, um (0.3 s), 0.1 s gap, speech
        e = env_of((1.0, LOUD), (0.1, QUIET), (0.3, -30), (0.1, QUIET), (1.0, LOUD))
        w = words_of((0.0, 1.0, "so"), (1.1, 1.4, "um"), (1.5, 2.5, "yes"))
        cuts, refused, _ = t.plan(w, e, params(dead_air=False), t.find_fillers(w))
        self.assertEqual(refused, [])
        self.assertEqual(len(cuts), 1)
        c = cuts[0]
        self.assertEqual(c.reasons, {"filler"})
        self.assertEqual(c.owned, {1})
        self.assertLessEqual(c.start, 1.1)
        self.assertGreaterEqual(c.end, 1.4)
        self.assertGreaterEqual(c.start, 1.0)       # not into "so"
        self.assertLessEqual(c.end, 1.5)            # not into "yes"

    def test_filler_inside_dead_air_merges_reasons(self):
        e = env_of((1.0, LOUD), (0.5, QUIET), (0.3, -30), (0.5, QUIET), (1.0, LOUD))
        w = words_of((0.0, 1.0, "so"), (1.5, 1.8, "uh"), (2.3, 3.3, "yes"))
        cuts, refused, _ = t.plan(w, e, params(), t.find_fillers(w))
        self.assertEqual(refused, [])
        self.assertEqual(len(cuts), 1)
        self.assertEqual(cuts[0].reasons, {"dead-air", "filler"})
        self.assertGreater(cuts[0].dur, 1.0)

    def test_filler_fused_with_speech_refused(self):
        # "um" runs straight into the next word with no quiet gap
        e = env_of((1.0, LOUD), (0.1, QUIET), (1.5, -25), (0.5, QUIET))
        w = words_of((0.0, 1.0, "so"), (1.1, 1.4, "um"), (1.4, 2.6, "okay"))
        cuts, refused, _ = t.plan(w, e, params(dead_air=False), t.find_fillers(w))
        self.assertEqual(cuts, [])
        self.assertEqual([r.code for r in refused], ["fused-with-speech"])

    def test_filler_with_no_energy_refused(self):
        e = env_of((1.0, LOUD), (1.0, QUIET), (1.0, LOUD))
        w = words_of((0.0, 1.0, "so"), (1.2, 1.5, "um"), (2.0, 3.0, "yes"))
        cuts, refused, _ = t.plan(w, e, params(dead_air=False), t.find_fillers(w))
        self.assertEqual(cuts, [])
        self.assertEqual(refused[0].code, "no-energy")

    def test_silent_word_inside_dead_air_refused(self):
        # a transcript word sits in a "silent" run: we cannot tell what it is, so the pause is not cut
        e = env_of((1.0, LOUD), (1.5, QUIET), (1.0, LOUD))
        w = words_of((0.0, 1.0, "so"), (1.4, 1.6, "it"), (2.5, 3.5, "yes"))
        cuts, refused, _ = t.plan(w, e, params(), [])
        self.assertEqual(cuts, [])
        self.assertEqual([r.code for r in refused], ["silent-word"])

    def test_clip_check_refuses_speech_in_cut(self):
        e = env_of((1.0, LOUD), (1.0, LOUD), (1.0, QUIET))
        w = words_of((0.0, 1.0, "one"), (1.0, 2.0, "two"))
        c = t.Cut(1.2, 2.5, {"dead-air"})
        bad = t.clip_check(c, w, e, act_of(e))
        self.assertEqual(bad[0], "clips-word")
        self.assertEqual(bad[2], ["two"])

    def test_clip_check_allows_owned_word(self):
        e = env_of((1.0, QUIET), (0.3, -30), (1.0, QUIET))
        w = words_of((1.0, 1.3, "um"))
        c = t.Cut(0.98, 1.32, {"filler"}, {0})
        self.assertIsNone(t.clip_check(c, w, e, act_of(e)))

    def test_cut_at_range_start_not_extended_past_measured(self):
        e = env_of((0.9, QUIET), (1.0, LOUD), t0=10.0)
        cuts, _, _ = t.plan(words_of((10.9, 11.9, "hi")), e, params(), [])
        self.assertEqual(len(cuts), 1)
        self.assertGreaterEqual(cuts[0].start, 10.0)
        self.assertLessEqual(cuts[0].end, 10.9)

    def test_frame_grid(self):
        e, w = self.talk_pause_talk(1.5)
        cuts, refused, _ = t.plan(w, e, params(fps=30.0), [])
        self.assertEqual(len(cuts), 1)
        for edge in (cuts[0].start, cuts[0].end):
            self.assertAlmostEqual(edge * 30.0, round(edge * 30.0), places=6)

    def test_sliver_between_cuts_merged_when_quiet(self):
        e = env_of((1.0, LOUD), (1.0, QUIET), (0.02, QUIET), (1.0, QUIET), (1.0, LOUD))
        cuts, _, _ = t.plan(words_of((0, 1, "a"), (3.02, 4.02, "b")), e, params(), [])
        self.assertEqual(len(cuts), 1)

    def test_no_cut_overlaps(self):
        e = env_of((1, LOUD), (1, QUIET), (1, LOUD), (1.4, QUIET), (1, LOUD))
        w = words_of((0, 1, "a"), (2, 3, "b"), (4.4, 5.4, "c"))
        cuts, _, _ = t.plan(w, e, params(), [])
        for a, b in zip(cuts, cuts[1:]):
            self.assertLessEqual(a.end, b.start)


class Ranges(unittest.TestCase):
    def test_keep_ranges_conserve_time(self):
        cuts = [t.Cut(1.0, 1.5), t.Cut(3.0, 3.25)]
        keeps = t.keep_ranges(cuts, 0.0, 10.0)
        self.assertEqual(keeps, [(0.0, 1.0), (1.5, 3.0), (3.25, 10.0)])
        self.assertAlmostEqual(sum(b - a for a, b in keeps), 10.0 - 0.75)

    def test_keep_ranges_cut_at_edges(self):
        keeps = t.keep_ranges([t.Cut(0.0, 1.0), t.Cut(9.0, 10.0)], 0.0, 10.0)
        self.assertEqual(keeps, [(1.0, 9.0)])

    def test_filter_script_fades_only_at_joins(self):
        s = t.filter_script([(0.0, 1.0), (1.5, 3.0), (3.5, 5.0)], 0.0, False, (0.0, 5.0))
        self.assertEqual(s.count("afade=t=in"), 2)      # not on the first piece
        self.assertEqual(s.count("afade=t=out"), 2)     # not on the last piece
        self.assertIn(f"d={t.FADE}", s)
        self.assertTrue(s.rstrip().endswith("concat=n=3:v=0:a=1[a]"))

    def test_filter_script_video(self):
        s = t.filter_script([(0.0, 1.0), (1.5, 3.0)], 0.0, True, (0.0, 3.0))
        self.assertIn("concat=n=2:v=1:a=1[v][a]", s)

    def test_grid_edge(self):
        e = env_of((2.0, QUIET))
        act = act_of(e)
        g = t.grid_edge(e, act, 1.0123, 30.0, +1)
        self.assertAlmostEqual(g, 31 / 30.0)
        g = t.grid_edge(e, act, 1.0123, 30.0, -1)
        self.assertAlmostEqual(g, 30 / 30.0)

    def test_calm_notes(self):
        notes = t.calm_notes([t.Cut(1.0, 1.3), t.Cut(2.0, 3.0)])
        self.assertEqual(len(notes), 2)
        self.assertEqual(t.calm_notes([t.Cut(1.0, 2.0), t.Cut(8.0, 9.0)]), [])


class OutputGuard(unittest.TestCase):
    def test_never_source_final_or_existing(self):
        with tempfile.TemporaryDirectory() as d:
            src = Path(d) / "a.wav"
            src.write_bytes(b"x")
            with self.assertRaises(SystemExit):
                t.claim(src, src, True)
            fin = Path(d) / "final" / "a.mp4"
            with self.assertRaises(SystemExit):
                t.claim(fin, src, True)
            ex = Path(d) / "o.wav"
            ex.write_bytes(b"x")
            with self.assertRaises(SystemExit):
                t.claim(ex, src, False)
            self.assertEqual(t.claim(ex, src, True), ex.resolve())


def _ffmpeg():
    for c in ("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg", shutil.which("ffmpeg")):
        if c and Path(c).exists():
            return c
    return None


@unittest.skipUnless(_ffmpeg(), "ffmpeg not installed")
class EndToEnd(unittest.TestCase):
    def test_apply_duration_and_refusal(self):
        ff = _ffmpeg()
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            wav = d / "s.wav"
            # 1 s tone, 1.5 s silence, 1 s tone: one dead-air cut expected
            subprocess.run([ff, "-v", "error", "-f", "lavfi", "-i", "sine=f=220:d=1", "-f", "lavfi",
                            "-i", "anullsrc=r=16000:cl=mono:d=1.5", "-f", "lavfi", "-i", "sine=f=330:d=1",
                            "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1,aformat=sample_rates=16000:channel_layouts=mono",
                            str(wav)], check=True)
            tr = d / "s.json"
            tr.write_text(json.dumps([[0.0, 1.0, "hello"], [2.5, 3.5, "world"]]))
            out = d / "out"
            fp = Path(ff).with_name("ffprobe")
            with contextlib.redirect_stdout(io.StringIO()):
                rc = t.main([str(tr), str(wav), "--out", str(out), "--apply", "--ffmpeg", ff,
                             "--ffprobe", str(fp) if fp.exists() else "ffprobe"])
            self.assertEqual(rc, 0)
            edl = json.loads((out / "s.trim-v1.edl.json").read_text())
            self.assertEqual(edl["schema"], t.SCHEMA)
            self.assertEqual(len(edl["cuts"]), 1)
            self.assertTrue(edl["render"]["ok"])
            self.assertAlmostEqual(edl["render"]["actual_duration"],
                                   edl["totals"]["input_duration"] - edl["totals"]["cut_total"], delta=0.05)
            self.assertTrue((out / "s.trim-v1.report.md").exists())
            # refuses to overwrite media
            with self.assertRaises(SystemExit):
                t.main([str(tr), str(wav), "--out", str(out), "--apply", "--overwrite", "--ffmpeg", ff])
            self.assertEqual(wav.read_bytes()[:4], b"RIFF")


if __name__ == "__main__":
    unittest.main()
