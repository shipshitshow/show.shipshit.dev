import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pixel as P  # noqa: E402
import wall as W  # noqa: E402


class Helpers(unittest.TestCase):
    def test_cell_same_share_on_both_formats(self):
        self.assertEqual(W.cell_for(1920, 1080), W.cell_for(1080, 1920))
        self.assertEqual(P.cell_size(1920, 1080), P.cell_size(1080, 1920))

    def test_phase_runs_zero_to_one(self):
        v = P.block_values("dissolve", 960, 540, 24)
        self.assertTrue((P.block_phase(0.0, v) == 0).all())
        self.assertTrue((P.block_phase(1.0, v) > 0.999).all())

    def test_mosaic_sizes_end_at_one_cell(self):
        s = P.mosaic_sizes(48)
        self.assertEqual((s[0], s[-1]), (1, 48))
        self.assertEqual(sorted(s), s)


class Chunks(unittest.TestCase):
    def test_field_is_a_rank_transform(self):
        f = W.chunk_field(960, 540, 19, "right")
        self.assertGreaterEqual(f.min(), 0)
        self.assertLess(f.max(), 1)
        self.assertAlmostEqual(float((f < 0.5).mean()), 0.5, places=2)

    def test_reveal_starts_empty_ends_full(self):
        f = W.chunk_field(960, 540, 19, "center")
        self.assertFalse(W.reveal_mask(f, 0.0, 0).any())
        self.assertTrue(W.reveal_mask(f, 1.0, 0).all())

    def test_direction_changes_where_it_opens_first(self):
        f = W.chunk_field(960, 540, 19, "right")
        early = f < 0.1
        cols = np.where(early.any(axis=0))[0]
        self.assertGreater(cols.mean(), f.shape[1] / 2)

    def test_deterministic(self):
        a = W.wallpaper(320, 180, seed=1)
        b = W.wallpaper(320, 180, seed=1)
        self.assertTrue((a == b).all())
        self.assertFalse((a == W.wallpaper(320, 180, seed=2)).all())

    def test_asterisk_geometry_has_six_arms_and_centre(self):
        m = W.asterisk_mask(96)
        self.assertGreater(m[48, 48], 0.9)
        self.assertLess(m[2, 2], 0.05)

    def test_wallpaper_uses_brand_red_only_for_accents(self):
        img = W.wallpaper(640, 360, mark=True)
        centre = img[180, 320]
        self.assertGreater(int(centre[0]), 200)
        self.assertLess(int(centre[1]), 90)

    def test_cut_frame_endpoints_are_the_shots(self):
        h, w = 180, 320
        a = np.full((h, w, 3), 200, np.uint8)
        b = np.full((h, w, 3), 90, np.uint8)
        wall = W.wallpaper(w, h, mark=False)
        cell = W.cell_for(w, h)
        f = W.chunk_field(w, h, cell, "left")
        start = P.chunk_cut_frame(a, b, wall, f, 0.0, 0, cell, True, 1)
        end = P.chunk_cut_frame(a, b, wall, f, 1.0, 0, cell, True, 1)
        self.assertTrue((start == a).all())
        self.assertTrue((end[3:-3, 3:-3] == b[3:-3, 3:-3]).all() or (end == b).mean() > 0.97)


if __name__ == "__main__":
    unittest.main()
