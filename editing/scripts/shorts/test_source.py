"""source_path: the raw named in short.json is the default; a .graded copy is used only when asked for.

Run: python3 -m unittest discover -s editing/scripts/shorts
"""
import contextlib
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import common as C  # noqa: E402


class SourcePath(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ep = Path(self.tmp.name)
        (self.ep / "raw").mkdir()
        self.raw = self.ep / "raw" / "261124.mp4"
        self.graded = self.ep / "raw" / "261124.graded.mp4"
        self.raw.write_bytes(b"raw")
        self.cfg = {"source": "raw/261124.mp4", "segs": [{"a": 0, "b": 1}]}

    def call(self, **kw):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            p = C.source_path(self.cfg, self.ep, **kw)
        return p, err.getvalue()

    def make_graded(self, newer=True):
        self.graded.write_bytes(b"graded")
        t = self.raw.stat().st_mtime + (60 if newer else -60)
        os.utime(self.graded, (t, t))

    def test_default_is_the_raw_and_says_so(self):
        p, err = self.call()
        self.assertEqual(p, self.raw)
        self.assertIn(str(self.raw), err)
        self.assertEqual(err.count("\n"), 1)

    def test_current_graded_copy_is_ignored_by_default(self):
        self.make_graded()
        self.assertEqual(self.call()[0], self.raw)

    def test_graded_flag_uses_the_graded_copy(self):
        self.make_graded()
        p, err = self.call(graded=True)
        self.assertEqual(p, self.graded)
        self.assertIn("graded", err)

    def test_short_json_source_graded_uses_the_graded_copy(self):
        self.make_graded()
        self.cfg["source_graded"] = True
        self.assertEqual(self.call()[0], self.graded)

    def test_source_override_wins_over_graded(self):
        self.make_graded()
        other = self.ep / "other.mp4"
        other.write_bytes(b"x")
        p, err = self.call(override=str(other), graded=True)
        self.assertEqual(p, other)
        self.assertIn("--source", err)

    def test_graded_requested_but_missing_or_stale_is_an_error(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            C.source_path(self.cfg, self.ep, graded=True)
        self.make_graded(newer=False)
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            C.source_path(self.cfg, self.ep, graded=True)

    def test_missing_raw_is_an_error(self):
        self.raw.unlink()
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            C.source_path(self.cfg, self.ep)


if __name__ == "__main__":
    unittest.main()
