"""Unit tests for dual.py: caption parsing, chunking, zone fitting, ASS output, ffmpeg commands and the --dry-run path.
Pure logic, run with python3 -m unittest. No ffmpeg, ffprobe or Pillow needed (the text measure is injected)."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import dual as D

Z = D.Z
LAND = Z.PROFILES["landscape"]
INFO = {"width": 1920, "height": 1080, "fps": "60/1", "video_codec": "h264", "colour": {"color_space": "bt709"},
        "audio": True, "duration": 30.0}
M_ON = {"input_i": "-13.9", "input_tp": "-1.7", "input_lra": "7.0", "input_thresh": "-24.0", "target_offset": "0.1"}


def mono(text, cap_h):
    """Fake text measure: 0.6 em per character, so widths scale with the cap height like the real font."""
    return len(text) * 0.6 * D.em_size(cap_h)


class Srt(unittest.TestCase):
    def test_parse(self):
        cues = D.parse_srt("﻿1\r\n00:00:01,500 --> 00:00:03,000\r\nHello there\r\nfriend\r\n\r\n2\r\n01:00:00,000 --> 01:00:01,250\r\nLate\r\n")
        self.assertEqual(cues, [(1.5, 3.0, "Hello there friend"), (3600.0, 3601.25, "Late")])

    def test_millis_pad(self):
        self.assertEqual(D.parse_srt("1\n00:00:01,5 --> 00:00:02,25\nx\n")[0][:2], (1.5, 2.25))

    def test_skips_empty_and_backwards(self):
        self.assertEqual(D.parse_srt("1\n00:00:02,000 --> 00:00:01,000\nback\n\n2\n00:00:03,000 --> 00:00:04,000\n"), [])


class Chunks(unittest.TestCase):
    def words(self, n, step=0.3, dur=0.25):
        return [(f"w{i}", i * step, i * step + dur) for i in range(n)]

    def test_max_words(self):
        cs = D.words_to_chunks(self.words(13))
        self.assertTrue(all(len(c["tokens"]) <= D.MAX_WORDS for c in cs))
        self.assertEqual(sum(len(c["tokens"]) for c in cs), 13)

    def test_pause_breaks(self):
        ws = [("a", 0, 0.2), ("b", 0.25, 0.4), ("c", 2.0, 2.2)]
        self.assertEqual([c["tokens"] for c in D.words_to_chunks(ws)], [["a", "b"], ["c"]])

    def test_sentence_end_breaks_after_three(self):
        ws = [("one", 0, 0.2), ("two", 0.25, 0.4), ("three.", 0.45, 0.6), ("four", 0.65, 0.8)]
        self.assertEqual([c["tokens"] for c in D.words_to_chunks(ws)], [["one", "two", "three."], ["four"]])

    def test_chunk_times_follow_words(self):
        c = D.words_to_chunks(self.words(3))[0]
        self.assertEqual((c["a"], c["b"], c["starts"]), (0, 0.85, [0, 0.3, 0.6]))


class Load(unittest.TestCase):
    def write(self, name, body):
        p = Path(tempfile.mkdtemp()) / name
        p.write_text(body if isinstance(body, str) else json.dumps(body))
        return p

    def test_srt_is_phrase_level(self):
        cs, kind = D.load_captions(self.write("a.srt", "1\n00:00:00,000 --> 00:00:02,000\nhi there\n"))
        self.assertEqual((kind, cs[0]["tokens"], cs[0]["starts"]), ("phrases", ["hi", "there"], None))

    def test_whisper_json(self):
        data = {"transcription": [{"text": "[_BEG_]", "offsets": {"from": 0, "to": 100}},
                                  {"text": " Hello", "offsets": {"from": 200, "to": 500}},
                                  {"text": " world", "offsets": {"from": 500, "to": 900}}]}
        cs, kind = D.load_captions(self.write("w.json", data))
        self.assertEqual((kind, cs[0]["tokens"], cs[0]["starts"]), ("words", ["Hello", "world"], [0.2, 0.5]))

    def test_words_json(self):
        cs, kind = D.load_captions(self.write("words.json", [["go", 1.0, 1.2], ["now", 1.25, 1.5]]))
        self.assertEqual((kind, cs[0]["tokens"], cs[0]["a"]), ("words", ["go", "now"], 1.0))

    def test_capsw_json(self):
        cs, kind = D.load_captions(self.write("capsw.json", [[1.0, 2.0, "go now", [["go", 1.0], ["now", 1.5]]]]))
        self.assertEqual((kind, cs[0]["starts"], cs[0]["b"]), ("words", [1.0, 1.5], 2.0))

    def test_capsw_word_count_mismatch_degrades_to_phrase(self):
        cs, kind = D.load_captions(self.write("capsw.json", [[1.0, 2.0, "go now please", [["go", 1.0]]]]))
        self.assertEqual((kind, cs[0]["starts"]), ("phrases", None))

    def test_unknown_format_dies(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            D.load_captions(self.write("x.json", {"nope": 1}))


class Timing(unittest.TestCase):
    def test_shift_and_drop(self):
        cs = [D.chunk(["a"], None, 1.0, 2.0), D.chunk(["b", "c"], [3.0, 3.5], 3.0, 4.0)]
        out = D.shift(cs, -2.5)
        self.assertEqual([(c["tokens"], round(c["a"], 2), round(c["b"], 2)) for c in out], [(["b", "c"], 0.5, 1.5)])
        self.assertEqual(out[0]["starts"], [0.5, 1.0])

    def test_shift_clamps_start_at_zero(self):
        out = D.shift([D.chunk(["a"], None, 1.0, 3.0)], -2.0)
        self.assertEqual((out[0]["a"], out[0]["b"]), (0.0, 1.0))

    def test_clip(self):
        cs = [D.chunk(["a"], None, 1, 9), D.chunk(["b"], None, 12, 14)]
        out = D.clip(cs, 10)
        self.assertEqual([(c["tokens"], c["b"]) for c in out], [(["a"], 9)])


class Fit(unittest.TestCase):
    def test_short_line_keeps_full_size(self):
        out, unfit = D.fit([D.chunk(["hello", "world"], None, 0, 1)], LAND, mono)
        self.assertEqual((out[0]["cap_h"], out[0]["text"], unfit), (LAND["cap_h"], "HELLO WORLD", []))

    def test_long_line_steps_down_then_fits(self):
        toks = ["x" * 5] * 6            # 35 chars: 35*.6*67 = 1407 at 48; fits at 48
        c = D.chunk(toks, None, 0, 1)
        wide = D.chunk(["y" * 6] * 6, None, 0, 1)   # 41 chars: 41*.6*67 = 1648 at 48, fits at 48; 6*7=41
        out, _ = D.fit([c, wide], LAND, mono)
        self.assertTrue(all(o["width"] <= LAND["max_w"] for o in out))

    def test_overlong_line_is_split_with_times(self):
        toks = [f"word{i}" for i in range(8)]
        c = D.chunk(toks, [i * 0.5 for i in range(8)], 0, 4.0)
        out, unfit = D.fit([c], LAND, lambda t, h: len(t) * 0.9 * D.em_size(h))
        self.assertGreater(len(out), 1)
        self.assertEqual(unfit, [])
        self.assertEqual([t for o in out for t in o["tokens"]], toks)
        self.assertEqual(out[0]["b"], out[1]["a"])
        self.assertTrue(all(o["width"] <= LAND["max_w"] for o in out))

    def test_plain_split_shares_time_by_characters(self):
        out = D.split_chunk(D.chunk(["aa", "bb", "cc", "dd"], None, 0, 4.0))
        self.assertEqual([o["tokens"] for o in out], [["aa", "bb"], ["cc", "dd"]])
        self.assertAlmostEqual(out[0]["b"], 2.0)

    def test_single_word_too_wide_is_reported(self):
        out, unfit = D.fit([D.chunk(["x"], None, 0, 1)], LAND, lambda t, h: 5000)
        self.assertEqual(len(unfit), 1)
        self.assertEqual(out[0]["cap_h"], Z.cap_sizes(LAND)[-1])

    def test_fitted_extent_passes_the_package_zone(self):
        out, _ = D.fit([D.chunk(["hello", "world", "again"], None, 0, 1)], LAND, mono)
        ext = D.extent(out, LAND)
        self.assertEqual(Z.violations(LAND, tuple(ext)), [])

    def test_extent_empty(self):
        self.assertIsNone(D.extent([], LAND))


class Ass(unittest.TestCase):
    def fitted(self, starts):
        c = D.chunk(["go", "now", "ok"], starts, 1.0, 2.0)
        out, _ = D.fit([c], LAND, mono)
        return out

    def test_time_format(self):
        self.assertEqual(D.ass_time(3725.456), "1:02:05.46")
        self.assertEqual(D.ass_time(-1), "0:00:00.00")

    def test_bgr_is_swapped(self):
        self.assertEqual(D.bgr((232, 59, 59)), "&H3B3BE8&")

    def test_karaoke_one_event_per_word_with_red_active(self):
        ass = D.build_ass(self.fitted([1.0, 1.4, 1.7]), LAND, "words")
        lines = [ln for ln in ass.splitlines() if ln.startswith("Dialogue")]
        self.assertEqual(len(lines), 3)
        self.assertIn("{\\c&H3B3BE8&}GO{\\c&HFFFFFF&} NOW OK", lines[0])
        self.assertIn("GO NOW {\\c&H3B3BE8&}OK{\\c&HFFFFFF&}", lines[2])
        self.assertTrue(lines[0].startswith("Dialogue: 0,0:00:01.00,0:00:01.40"))
        self.assertTrue(lines[2].endswith("OK{\\c&HFFFFFF&}") and lines[2].count("\\c&H3B3BE8&") == 1)

    def test_phrases_are_plain_white(self):
        ass = D.build_ass(self.fitted(None), LAND, "phrases")
        lines = [ln for ln in ass.splitlines() if ln.startswith("Dialogue")]
        self.assertEqual(len(lines), 1)
        self.assertNotIn("3B3BE8", lines[0])
        self.assertTrue(lines[0].endswith("GO NOW OK"))

    def test_position_size_and_canvas(self):
        ass = D.build_ass(self.fitted(None), LAND, "phrases")
        self.assertIn("PlayResX: 1920", ass)
        self.assertIn("PlayResY: 1080", ass)
        self.assertIn(f"\\an5\\pos(960,{LAND['cy']})", ass)
        self.assertIn(f"\\fs{round(D.em_size(48) * D.ASS_CELL)}", ass)
        self.assertIn("\\bord3\\xshad3\\yshad4", ass)

    def test_override_braces_are_stripped(self):
        c = D.chunk(["a{\\b1}b"], None, 0, 1)
        ass = D.build_ass(D.fit([c], LAND, mono)[0], LAND, "phrases")
        self.assertNotIn("{\\b1}", ass)

    def test_zero_length_word_events_skipped(self):
        c = D.chunk(["a", "b"], [-3.0, -2.0], 0.0, 1.0)
        out, _ = D.fit([c], LAND, mono)
        lines = [ln for ln in D.build_ass(out, LAND, "words").splitlines() if ln.startswith("Dialogue")]
        self.assertEqual(len(lines), 1)     # word "a" (-3..-2) is entirely before zero; "b" runs -2..1


class Audio(unittest.TestCase):
    def test_on_target_is_left_alone(self):
        self.assertFalse(D.needs_norm(M_ON))

    def test_quiet_and_hot_need_norm(self):
        self.assertTrue(D.needs_norm({**M_ON, "input_i": "-20.0"}))
        self.assertTrue(D.needs_norm({**M_ON, "input_tp": "0.5"}))

    def test_filter_has_measure_limiter_and_no_autolevel(self):
        f = D.audio_filter(M_ON)
        self.assertIn("loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=-13.9:measured_TP=-1.7", f)
        self.assertIn("linear=true", f)
        self.assertIn("alimiter=limit=0.7943:level=disabled", f)
        self.assertTrue(f.endswith("aresample=48000"))


class Commands(unittest.TestCase):
    def build(self, norm):
        d = Path("/o")
        outs = {"clean": d / "m-youtube.mp4", "x": d / "m-x.mp4"}
        audio = d / "m-audio.m4a" if norm else Path("/in/m.mp4")
        return D.commands("ffmpeg", Path("/in/m.mp4"), audio, d / "m-captions.ass", outs, INFO, D.audio_filter(M_ON) if norm else None)

    def test_clean_is_a_pure_stream_copy_without_captions(self):
        for norm in (True, False):
            c = self.build(norm)["clean"]
            self.assertIn("copy", c)
            self.assertEqual(c[c.index("-c") + 1], "copy")
            self.assertFalse(any("ass=" in a or "-vf" == a for a in c))
            self.assertNotIn("libx264", c)

    def test_x_burns_captions_full_quality_same_size(self):
        c = self.build(True)["x"]
        self.assertTrue(any(a.startswith("ass=m-captions.ass:fontsdir=") for a in c))
        self.assertEqual(c[c.index("-c:v") + 1], "libx264")
        self.assertEqual(c[c.index("-crf") + 1], "16")
        vf = c[c.index("-vf") + 1]
        self.assertTrue(vf.startswith("ass=") and "scale" not in vf)          # captions only: no downscale
        for flag in ("-s", "-fs", "-b:v", "-maxrate", "-bufsize"):             # no size, bitrate or file-size cap
            self.assertNotIn(flag, c)
        self.assertIn("-colorspace", c)

    def test_both_copies_take_the_same_audio_unchanged(self):
        cmds = self.build(True)
        for k in ("clean", "x"):
            c = cmds[k]
            self.assertIn("/o/m-audio.m4a", c)
            self.assertEqual(c[c.index("-map") + 3], "1:a:0")
        self.assertEqual(cmds["x"][cmds["x"].index("-c:a") + 1], "copy")
        self.assertEqual(list(cmds), ["audio", "clean", "x"])

    def test_on_target_audio_skips_the_audio_pass(self):
        cmds = self.build(False)
        self.assertEqual(list(cmds), ["clean", "x"])
        self.assertIn("/in/m.mp4", cmds["clean"][cmds["clean"].index("-i", cmds["clean"].index("-i") + 1) + 1])


class Main(unittest.TestCase):
    def run_main(self, args):
        buf = io.StringIO()
        with mock.patch.object(D, "probe", return_value=INFO), mock.patch.object(D.C, "find_bin", side_effect=lambda n, o=None: n), \
                contextlib.redirect_stdout(buf):
            rc = D.main(args)
        return rc, buf.getvalue()

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "m.mp4").write_bytes(b"x")
        (self.tmp / "m.srt").write_text("1\n00:00:01,000 --> 00:00:02,000\nhello there\n")

    def test_dry_run_prints_commands_and_writes_nothing(self):
        out = self.tmp / "out"
        rc, text = self.run_main([str(self.tmp / "m.mp4"), "--out", str(out), "--dry-run"])
        self.assertEqual(rc, 0)
        self.assertFalse(out.exists())
        self.assertIn("loudnorm", text)
        self.assertIn("-c copy", text)
        self.assertIn("libx264", text)
        self.assertIn("m-youtube.mp4", text)
        self.assertIn("m-x.mp4", text)

    def test_refuses_to_overwrite(self):
        out = self.tmp / "out"
        out.mkdir()
        (out / "m-x.mp4").write_bytes(b"old")
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            self.run_main([str(self.tmp / "m.mp4"), "--out", str(out)])
        self.assertEqual((out / "m-x.mp4").read_bytes(), b"old")

    def test_wrong_canvas_for_profile_dies(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            self.run_main([str(self.tmp / "m.mp4"), "--out", str(self.tmp / "o"), "--profile", "stacked", "--dry-run"])

    def test_needs_master_and_out(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            D.main([])


if __name__ == "__main__":
    unittest.main()
