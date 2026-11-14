"""Unit tests for the revisions log and b-roll credits (pure logic; synthetic data only).

Run: python3 -m unittest discover -s editing/scripts/revisions -p 'test_*.py'
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
import revlog  # noqa: E402


def rec(n, inputs=None, outputs=None, tools=None, edl=None, note="x"):
    return {"n": n, "version": f"v{n}", "note": note, "inputs": inputs or {}, "outputs": outputs or [],
            "tools": tools or {}, "edl": edl}


class TestNumbering(unittest.TestCase):
    def test_first_and_next(self):
        self.assertEqual(revlog.next_version([]), 1)
        self.assertEqual(revlog.next_version([rec(1), rec(2)]), 3)

    def test_parse_version(self):
        self.assertEqual(revlog.parse_version("v3"), 3)
        self.assertEqual(revlog.parse_version("V12"), 12)
        self.assertEqual(revlog.parse_version("2"), 2)
        with self.assertRaises(ValueError):
            revlog.parse_version("latest")

    def test_find_record(self):
        rs = [rec(1), rec(2)]
        self.assertEqual(revlog.find_record(rs, "v2")["n"], 2)
        with self.assertRaises(ValueError):
            revlog.find_record(rs, "v9")

    def test_parse_field(self):
        self.assertEqual(revlog.parse_field("lufs=-14"), ("lufs", -14))
        self.assertEqual(revlog.parse_field("kit=v2 rc"), ("kit", "v2 rc"))
        with self.assertRaises(ValueError):
            revlog.parse_field("nokey")

    def test_parse_log_rejects_corrupt_line(self):
        with self.assertRaises(ValueError):
            revlog.parse_log('{"n": 1}\nnot json\n')

    def test_chain_detects_edit(self):
        l1 = json.dumps({"n": 1, "version": "v1", "prev": None})
        l2 = json.dumps({"n": 2, "version": "v2", "prev": revlog.sha256_text(l1)})
        self.assertEqual(revlog.check_chain(l1 + "\n" + l2 + "\n"), [])
        tampered = l1.replace('"n": 1', '"n": 7')
        self.assertEqual(len(revlog.check_chain(tampered + "\n" + l2 + "\n")), 1)


class TestDiff(unittest.TestCase):
    def test_input_hash_comparison(self):
        a = rec(1, inputs={"source": {"sha256": "aa"}, "edl": {"sha256": "bb"}, "chapters.json": {"sha256": None}})
        b = rec(2, inputs={"source": {"sha256": "aa"}, "edl": {"sha256": "cc"}, "short:s1": {"sha256": "dd"}})
        d = revlog.diff_revisions(a, b)
        self.assertEqual([c["name"] for c in d["inputs"]["changed"]], ["edl"])
        self.assertEqual(d["inputs"]["unchanged"], ["source"])
        self.assertEqual(d["inputs"]["added"], ["short:s1"])
        self.assertEqual(d["inputs"]["removed"], ["chapters.json"])

    def test_unhashed_input_is_unknown_not_changed(self):
        a = rec(1, inputs={"source": {"sha256": "aa"}, "chapters.json": {"sha256": None, "missing": True}})
        b = rec(2, inputs={"source": {"sha256": None}, "chapters.json": {"sha256": None, "missing": True}})
        d = revlog.diff_revisions(a, b)
        self.assertEqual(d["inputs"]["unknown"], ["source"])
        self.assertEqual(d["inputs"]["changed"], [])
        self.assertEqual(d["inputs"]["unchanged"], ["chapters.json"])

    def test_output_deltas(self):
        o1 = {"path": "final.mp4", "sha256": "11", "duration_s": 600.0, "lufs_i": -16.0, "true_peak_dbtp": -2.0}
        o2 = {"path": "final.mp4", "sha256": "22", "duration_s": 590.5, "lufs_i": -14.0, "true_peak_dbtp": -1.5}
        d = revlog.diff_revisions(rec(1, outputs=[o1]), rec(2, outputs=[o2]))
        c = d["outputs"]["changed"][0]
        self.assertEqual(c["duration_delta_s"], -9.5)
        self.assertEqual(c["lufs_delta"], 2.0)
        self.assertEqual(c["true_peak_delta"], 0.5)

    def test_identical_output_is_unchanged(self):
        o = {"path": "final.mp4", "sha256": "11"}
        d = revlog.diff_revisions(rec(1, outputs=[o]), rec(2, outputs=[dict(o)]))
        self.assertEqual(d["outputs"]["changed"], [])
        self.assertEqual(len(d["outputs"]["unchanged"]), 1)

    def test_renamed_output_compared_by_position(self):
        d = revlog.diff_revisions(rec(1, outputs=[{"path": "a.mp4", "sha256": "1"}]),
                                  rec(2, outputs=[{"path": "b.mp4", "sha256": "2"}]))
        self.assertEqual(len(d["outputs"]["changed"]), 1)
        self.assertEqual(d["outputs"]["added"], [])

    def test_missing_measurements_do_not_crash(self):
        d = revlog.diff_revisions(rec(1, outputs=[{"path": "a", "sha256": "1", "lufs_i": None}]),
                                  rec(2, outputs=[{"path": "a", "sha256": "2", "lufs_i": -14.0}]))
        self.assertIsNone(d["outputs"]["changed"][0]["lufs_delta"])
        self.assertIn("output changed", revlog.format_diff(d))

    def test_tool_and_edl_changes(self):
        d = revlog.diff_revisions(rec(1, tools={"ffmpeg": "7.0", "scripts_commit": "abc"}, edl={"cut_count": 3, "removed_s": 10.0}),
                                  rec(2, tools={"ffmpeg": "7.1", "scripts_commit": "abc"}, edl={"cut_count": 4, "removed_s": 12.5}))
        self.assertEqual([t["name"] for t in d["tools"]], ["ffmpeg"])
        self.assertEqual({e["name"] for e in d["edl"]}, {"cut_count", "removed_s"})

    def test_render_md_includes_diff_from_second_revision(self):
        md = revlog.render_md([rec(1, note="first"), rec(2, note="second")], "999999")
        self.assertIn("## v1: first", md)
        self.assertIn("Since v1:", md)


class TestEdlSummary(unittest.TestCase):
    def test_generic_cuts(self):
        s = revlog.summarize_edl({"cuts": [{"start": 1, "end": 3, "reason": "silence"},
                                           {"start": 10, "end": 12.5, "reason": "silence"},
                                           {"start": 20, "end": 21, "reason": "retake"}]})
        self.assertEqual((s["cut_count"], s["removed_s"]), (3, 5.5))
        self.assertEqual(s["reasons"], {"retake": 1, "silence": 2})

    def test_overlapping_cuts_not_double_counted(self):
        s = revlog.summarize_edl({"cuts": [{"start": 0, "end": 5}, {"start": 3, "end": 8}]})
        self.assertEqual(s["removed_s"], 8.0)

    def test_keep_ranges_derive_cuts(self):
        s = revlog.summarize_edl({"duration": 100, "keep": [[0, 10], [15, 40], [60, 90]]})
        self.assertEqual(s["format"], "keep")
        self.assertEqual((s["keep_count"], s["kept_s"]), (3, 65.0))
        self.assertEqual((s["cut_count"], s["removed_s"]), (3, 35.0))

    def test_keep_ranges_without_source_duration_only_count_interior_gaps(self):
        s = revlog.summarize_edl({"keep": [{"start": 0, "end": 10}, {"start": 12, "end": 20}]})
        self.assertEqual((s["cut_count"], s["removed_s"]), (1, 2.0))

    def test_alternate_key_names_and_timestamps(self):
        s = revlog.summarize_edl({"removed": [{"in": "0:10", "out": "0:12"}, ["1:00", "1:03"]]})
        self.assertEqual((s["cut_count"], s["removed_s"]), (2, 5.0))

    def test_chapters_drop(self):
        s = revlog.summarize_edl({"chapters": [{"id": "a", "drop": [[1, 2]]}, {"id": "b"}, {"id": "c", "drop": [[5, 9]]}]})
        self.assertEqual((s["format"], s["cut_count"], s["removed_s"]), ("chapters-drop", 2, 5.0))

    def test_bad_ranges_are_skipped_not_fatal(self):
        s = revlog.summarize_edl({"cuts": [{"start": 5, "end": 2}, {"foo": 1}, {"start": 0, "end": 1}]})
        self.assertEqual((s["cut_count"], s["skipped"]), (1, 2))

    def test_unknown_format_degrades(self):
        for data in ({"hello": "world"}, 7, None, "text"):
            self.assertEqual(revlog.summarize_edl(data)["format"], "unknown")


class TestLoudness(unittest.TestCase):
    SAMPLE = """[Parsed_ebur128_0 @ 0x1] Summary:

  Integrated loudness:
    I:         -14.2 LUFS
    Threshold: -24.3 LUFS

  Loudness range:
    LRA:         6.1 LU

  True peak:
    Peak:       -1.3 dBFS
"""

    def test_parse(self):
        self.assertEqual(revlog.parse_ebur128(self.SAMPLE), {"lufs_i": -14.2, "true_peak_dbtp": -1.3})

    def test_silence_or_garbage_gives_none(self):
        self.assertEqual(revlog.parse_ebur128("nothing here"), {"lufs_i": None, "true_peak_dbtp": None})
        self.assertIsNone(revlog.parse_ebur128("Summary:\n I: -inf LUFS\n")["lufs_i"])


class TestCredits(unittest.TestCase):
    def make_episode(self, tmp: Path) -> Path:
        ep = tmp / "2099-01-01_990101"
        (ep / "out/video/assets/broll").mkdir(parents=True)
        return ep

    def clip(self, ep: Path, name: str, ext=".mp4") -> Path:
        d = ep / "out/video/assets/broll" / name
        d.mkdir(parents=True, exist_ok=True)
        f = d / f"{name}{ext}"
        f.write_bytes(b"x")
        return f

    def run_credits(self, ep: Path, plans=()):
        roots = revlog.broll_roots(ep, None)
        refs = revlog.collect_refs(ep, list(plans))
        return {e["key"]: e for e in revlog.build_credits(ep, refs, roots)}

    def test_no_metadata_is_unverified_and_nothing_invented(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            self.clip(ep, "bridge")
            (ep / "chapters.json").write_text(json.dumps({"chapters": [{"id": "intro", "broll": [{"asset": "bridge"}]}]}))
            e = self.run_credits(ep)["bridge"]
            self.assertEqual(e["status"], "UNVERIFIED")
            self.assertEqual(e["meta"], {})
            self.assertEqual(e["missing"], ["creator", "license"])
            md = revlog.render_credits_md(list(self.run_credits(ep).values()), "990101")
            self.assertIn("UNVERIFIED", md)
            self.assertIn("(no verified credits yet)", md)
            self.assertIn("0 credited, 1 UNVERIFIED", md)

    def test_json_sidecar_credits(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            f = self.clip(ep, "harbor")
            (f.parent / "harbor.json").write_text(json.dumps({
                "creator": "Sam Example", "source_url": "https://example.com/v/1", "license": "CC BY 4.0",
                "title": "Harbor"}))
            (ep / "chapters.json").write_text(json.dumps({"chapters": [{"id": "c1", "broll": ["harbor"]}]}))
            e = self.run_credits(ep)["harbor"]
            self.assertEqual(e["status"], "credited")
            md = revlog.render_credits_md([e], "990101")
            self.assertIn("\"Harbor\" by Sam Example - https://example.com/v/1 - CC BY 4.0", md)
            self.assertNotIn("UNVERIFIED**", md)

    def test_incomplete_sidecar_stays_unverified(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            f = self.clip(ep, "half")
            (f.parent / "half.json").write_text(json.dumps({"creator": "Sam Example"}))
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "half"}]}))
            e = self.run_credits(ep)["half"]
            self.assertEqual((e["status"], e["missing"]), ("UNVERIFIED", ["license"]))

    def test_license_txt_sidecar(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            f = self.clip(ep, "lic")
            (f.parent / "lic.license.txt").write_text("Creator: Pat Example\nSource: https://example.com/x\nLicense: CC0\n")
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "lic"}]}))
            e = self.run_credits(ep)["lic"]
            self.assertEqual(e["status"], "credited")
            self.assertEqual(e["meta"]["license"], "CC0")

    def test_credits_json_index_in_broll_folder(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            self.clip(ep, "one")
            self.clip(ep, "two")
            (ep / "out/video/assets/broll/credits.json").write_text(json.dumps({"clips": {
                "one": {"creator": "A", "license": "CC BY 4.0", "source_url": "https://example.com/1"}}}))
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "one"}, {"asset": "two"}]}))
            res = self.run_credits(ep)
            self.assertEqual(res["one"]["status"], "credited")
            self.assertEqual(res["two"]["status"], "UNVERIFIED")

    def test_original_work_marker(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            f = self.clip(ep, "mine")
            (f.parent / "mine.json").write_text(json.dumps({"original": True, "attribution_required": False}))
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "mine"}]}))
            e = self.run_credits(ep)["mine"]
            self.assertEqual(e["status"], "credited")
            md = revlog.render_credits_md([e], "990101")
            self.assertIn("(no b-roll credits required)", md)
            self.assertIn("attribution not required", md)

    def test_short_json_and_plan_overlays_are_scanned_and_deduped(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            self.clip(ep, "a")
            self.clip(ep, "b")
            sd = ep / "out/shorts/s1"
            sd.mkdir(parents=True)
            (sd / "short.json").write_text(json.dumps({"broll": [{"asset": "a", "a": 1, "b": 2, "cx": 0.5}]}))
            plan = ep / "plan.json"
            plan.write_text(json.dumps({"overlays": [{"beat": "broll", "name": "a"}, {"beat": "broll", "name": "b", "path": "b/b.mp4"},
                                                     {"beat": "intro", "name": "ignored"}]}))
            res = self.run_credits(ep, [plan])
            self.assertEqual(sorted(res), ["a", "b"])
            self.assertEqual(sorted(res["a"]["used_in"]), ["plan plan.json", "short s1"])

    def test_missing_clip_file_is_noted(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "ghost"}]}))
            e = self.run_credits(ep)["ghost"]
            self.assertEqual(e["status"], "UNVERIFIED")
            self.assertIn("clip file not found", e["notes"])

    def test_no_references_is_empty_not_an_error(self):
        with tempfile.TemporaryDirectory() as t:
            ep = self.make_episode(Path(t))
            self.assertEqual(self.run_credits(ep), {})

    def test_attribution_override_wins(self):
        self.assertEqual(revlog.attribution_line({"attribution": "Footage: X (CC BY)", "creator": "Y"}), "Footage: X (CC BY)")


class TestCli(unittest.TestCase):
    def run_cli(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            revlog.main(list(args))
        return out.getvalue()

    def test_add_show_diff_roundtrip(self):
        with tempfile.TemporaryDirectory() as t:
            ep = Path(t) / "2099-01-01_990101"
            (ep / "raw").mkdir(parents=True)
            (ep / "raw/990101.mp4").write_bytes(b"source-bytes")
            (ep / "chapters.json").write_text("{}")
            edl = ep / "edl.json"
            edl.write_text(json.dumps({"cuts": [{"start": 1, "end": 2}]}))
            final = ep / "final.mp4"
            final.write_bytes(b"not really a video")
            self.run_cli("add", "--episode-dir", str(ep), "--note", "first cut", "--edl", str(edl),
                         "--output", str(final), "--field", "kit=1")
            edl.write_text(json.dumps({"cuts": [{"start": 1, "end": 2}, {"start": 5, "end": 7}]}))
            final.write_bytes(b"changed bytes")
            self.run_cli("add", "--episode-dir", str(ep), "--note", "more cuts", "--edl", str(edl), "--output", str(final))
            lines = (ep / "out/revisions.jsonl").read_text().splitlines()
            self.assertEqual(len(lines), 2)
            r1, r2 = (json.loads(ln) for ln in lines)
            self.assertEqual((r1["version"], r2["version"]), ("v1", "v2"))
            self.assertEqual(r2["prev"], revlog.sha256_text(lines[0]))
            self.assertEqual(r1["inputs"]["source"]["sha256"], revlog.sha256_text("source-bytes"))
            self.assertEqual(r2["edl"]["cut_count"], 2)
            self.assertTrue((ep / "out/revisions.md").exists())
            listing = self.run_cli("show", "--episode-dir", str(ep))
            self.assertIn("v2", listing)
            diff = self.run_cli("diff", "--episode-dir", str(ep), "v1", "v2")
            self.assertIn("input changed   edl", diff)
            self.assertIn("output changed", diff)
            self.assertIn("edl changed     cut_count: 1 -> 2", diff)

    def test_credits_command_writes_file_and_strict_exits(self):
        with tempfile.TemporaryDirectory() as t:
            ep = Path(t) / "2099-01-01_990101"
            (ep / "out/video/assets/broll/x").mkdir(parents=True)
            (ep / "out/video/assets/broll/x/x.mp4").write_bytes(b"1")
            (ep / "chapters.json").write_text(json.dumps({"broll": [{"asset": "x"}]}))
            self.run_cli("credits", "--episode-dir", str(ep))
            self.assertIn("UNVERIFIED", (ep / "out/credits.md").read_text())
            with self.assertRaises(SystemExit) as cm, contextlib.redirect_stdout(io.StringIO()):
                revlog.main(["credits", "--episode-dir", str(ep), "--strict"])
            self.assertEqual(cm.exception.code, 1)


if __name__ == "__main__":
    unittest.main()
