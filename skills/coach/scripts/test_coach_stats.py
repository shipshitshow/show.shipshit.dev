import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import coach_stats as c  # noqa: E402


def cue(start, end, text):
    # Mimics YouTube manual-caption blocks (a timing line, then text).
    f = lambda s: f"{int(s // 60):02d}:{int(s % 60):02d}.000"
    return f"00:{f(start)} --> 00:{f(end)}\n{text}\n\n"


def make_vtt():
    cues = [
        (31, 35, "Welcome back everyone. What's up, Mitchell?"),
        (35, 37, ">> Hey, good to be here. How was your week?"),
        (37, 39, ">> Busy."),
        (40, 70, ">> I think agencies are dead. I built my own support desk last week and I fired the tool "
                 "we paid for, and I will never go back to it because the whole point is that it costs nothing, and honestly the team never even noticed the switch."),
        (70, 72, ">> Yeah."),
        (72, 80, ">> Whatever, I don't know, maybe that is true, but I don't think the problem is the price."),
        (80, 82, ">> Exactly, the chat asked about that."),
    ]
    # pad so the file has enough turns to be treated as speaker-marked
    for i in range(30):
        cues.append((90 + i * 4, 93 + i * 4, ">> Yeah, I tried that." if i % 2 else ">> But I disagree with that."))
    return "WEBVTT\n\n" + "".join(cue(*x) for x in cues)


class CoachStats(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "abc-live.en.vtt"
        self.path.write_text(make_vtt())

    def tearDown(self):
        self.dir.cleanup()

    def test_lanes_follow_name_anchor(self):
        r = c.analyze(self.path, ["Vincent", "Mitchell"])
        # lane 0 says "Mitchell", so lane 0 is Vincent
        self.assertEqual(r["attribution"]["lane0"], "Vincent")
        self.assertEqual(r["attribution"]["method"], "name-anchors")
        self.assertEqual(r["attribution"]["confidence"], "low")  # one anchor is never enough

    def test_lane0_override_and_flip(self):
        r = c.analyze(self.path, ["Vincent", "Mitchell"], lane0="Mitchell")
        self.assertEqual(r["attribution"]["lane0"], "Mitchell")
        flipped = c.analyze(self.path, ["Vincent", "Mitchell"], flips=[85])
        self.assertEqual(flipped["attribution"]["manual_flips_at"], ["1:25"])

    def test_opening_skips_greeting_and_finds_claim(self):
        r = c.analyze(self.path, ["Vincent", "Mitchell"])
        first = r["opening"]["first_non_greeting_turns"][0]
        self.assertEqual(first["at"], "0:41")
        self.assertEqual(first["seconds_since_live"], 11)
        self.assertTrue(first["has_claim_wording"])

    def test_measurements(self):
        r = c.analyze(self.path, ["Vincent", "Mitchell"])
        host = r["per_host"]
        self.assertGreaterEqual(sum(h["shrug_phrases"]["count"] for h in host.values()), 1)
        self.assertGreaterEqual(sum(h["stories_vs_read_aloud"]["story_turns"] for h in host.values()), 1)
        self.assertGreaterEqual(sum(h["agreement"]["turns_with_push_back"] for h in host.values()), 1)
        self.assertGreaterEqual(r["chat"]["mentions"], 1)

    def test_backchannel_does_not_break_monologue(self):
        r = c.analyze(self.path, ["Vincent", "Mitchell"])
        longest = max(
            (m for h in r["longest_monologues"].values() for m in h["longest"]), key=lambda m: m["seconds"]
        )
        self.assertGreaterEqual(longest["seconds"], 29)

    def test_no_markers_is_refused(self):
        bare = Path(self.dir.name) / "bare.vtt"
        bare.write_text("WEBVTT\n\n" + cue(31, 40, "Just one long line of words with no speaker change at all."))
        with self.assertRaises(SystemExit):
            c.analyze(bare, ["Vincent", "Mitchell"])

    def test_labelled_transcript(self):
        lab = Path(self.dir.name) / "lab.txt"
        lines = []
        for i in range(10):
            lines.append(f"[0:{31 + i * 6:02d}] Vincent: I think this is the point and I built it last week.")
            lines.append(f"[0:{34 + i * 6:02d}] Mitchell: But I disagree, honestly, the problem is the price.")
        lab.write_text("\n".join(lines))
        r = c.analyze(lab, ["Vincent", "Mitchell"])
        self.assertEqual(r["attribution"]["method"], "labels")
        self.assertEqual(r["per_host"]["Vincent"]["turns"], 10)

    def test_cli_markdown_with_previous(self):
        out = subprocess.run(
            [sys.executable, "-I", str(HERE / "coach_stats.py"), str(self.path), "--previous", str(self.path),
             "--format", "md"], capture_output=True, text=True, check=True).stdout
        self.assertIn("Last week", out)
        self.assertIn("Spot checks", out)
        json.loads(subprocess.run([sys.executable, "-I", str(HERE / "coach_stats.py"), str(self.path)],
                                  capture_output=True, text=True, check=True).stdout)


if __name__ == "__main__":
    unittest.main()
