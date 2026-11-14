import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pick as p  # noqa: E402

ARGS = {"min_len": 20.0, "max_len": 90.0, "ideal_min": 25.0, "ideal_max": 60.0, "top": 5, "exclude": [],
        "speakers": {}, "source": "raw/x.mp4"}


def words_from(sentences, start=0.0, wps=2.8, spk="S1", gap=0.6):
    """[(text, speaker?)] sentences -> word dicts with even timing and a pause between sentences."""
    out, t = [], start
    for item in sentences:
        text, who = (item, spk) if isinstance(item, str) else item
        for tok in text.split():
            out.append({"s": round(t, 3), "e": round(t + 0.3, 3), "t": tok, "spk": who})
            t += 1 / wps
        t += gap
    return out


GOOD = [
    "Nobody needs a video editor anymore and agencies are dead.",
    "I fired our editing agency last month and the bill went from 4,000 dollars to 40 dollars of tokens.",
    "The reason is simple, the work was never the cutting, it was the waiting.",
    "Every revision used to cost us two days and a meeting.",
    "Now I describe the change in one sentence and the agent ships a new cut in ten minutes.",
    "You should stop paying for turnaround time, because turnaround is the only thing AI actually removed.",
    "That is the whole business model of an agency, and it is gone.",
]
FILLER = [
    "So um I think like you know we were kind of talking about uh the thing",
    "and uh yeah basically I mean it is sort of like um you know a thing",
    "uh we uh just uh kind of uh went through um the uh whole um thing",
    "you know I mean uh basically like uh kind of um sort of it",
    "and um so uh yeah like you know uh the um it is uh kind of um basically that",
]


class Loading(unittest.TestCase):
    def test_turn_parsing_and_continuation(self):
        turns = p.parse_turns("[00:05] S1: Hello there.\ncontinued here\n[1:02:03] S2: Bye.\n")
        self.assertEqual([t["start"] for t in turns], [5, 3723])
        self.assertEqual(turns[0]["text"], "Hello there. continued here")
        self.assertEqual(turns[1]["spk"], "S2")

    def test_words_from_turns_are_monotonic_and_estimated(self):
        words = p.words_from_turns(p.parse_turns("[00:00] S1: one two three four five six.\n[00:10] S2: seven eight."))
        self.assertTrue(all(a["e"] <= b["s"] + 1e-6 for a, b in zip(words, words[1:])))
        self.assertEqual(words[-1]["spk"], "S2")
        self.assertGreaterEqual(words[-2]["s"], 10.0)

    def test_whisper_cpp_json(self):
        data = {"transcription": [
            {"text": "[_BEG_]", "offsets": {"from": 0, "to": 0}},
            {"text": " Hello", "offsets": {"from": 100, "to": 400}},
            {"text": " world.", "offsets": {"from": 500, "to": 900}}]}
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "w.json"
            f.write_text(json.dumps(data))
            words, timing = p.load_words(f)
        self.assertEqual([w["t"] for w in words], ["Hello", "world."])
        self.assertEqual(timing, "word")
        self.assertAlmostEqual(words[1]["s"], 0.5)

    def test_label_speakers(self):
        words = [{"s": 1.0, "e": 1.2, "t": "a", "spk": None}, {"s": 11.0, "e": 11.2, "t": "b", "spk": None}]
        p.label_speakers(words, p.parse_turns("[00:00] S1: a\n[00:10] S2: b"))
        self.assertEqual([w["spk"] for w in words], ["S1", "S2"])


class Sentences(unittest.TestCase):
    def test_split_on_punctuation_and_speaker(self):
        words = words_from(["First sentence is here.", ("Second one is here.", "S2")])
        sents = p.split_sentences(words)
        self.assertEqual(len(sents), 2)
        self.assertEqual(sents[1]["spk"], "S2")

    def test_abbreviation_does_not_split(self):
        self.assertFalse(p.ends_sentence("Dr."))
        self.assertTrue(p.ends_sentence("done."))
        self.assertTrue(p.ends_sentence('"yes?"'))

    def test_long_pause_splits_unpunctuated_speech(self):
        words = words_from(["a " * 26 + "end"], gap=0)
        words[-1]["s"] += 3
        words[-1]["e"] += 3
        self.assertEqual(len(p.split_sentences(words)), 2)


class FirstLine(unittest.TestCase):
    def w(self, text):
        return words_from([text])

    def test_connective_start_fails(self):
        ok, why = p.first_line_test(self.w("And that is why it never worked out."))
        self.assertFalse(ok)
        self.assertIn("and", why)

    def test_pronoun_start_fails(self):
        self.assertFalse(p.first_line_test(self.w("It was a terrible idea from the start."))[0])

    def test_short_reaction_fails(self):
        self.assertFalse(p.first_line_test(self.w("Yeah exactly."))[0])

    def test_claim_passes(self):
        self.assertTrue(p.first_line_test(self.w("Agencies are dead and nobody noticed."))[0])

    def test_trim_lead_drops_fillers_not_content(self):
        words = self.w("So yeah um I mean agencies are dead and nobody noticed.")
        k = p.trim_lead(words)
        self.assertEqual(p.norm(words[k]["t"]), "agencies")  # so, yeah, um, "I mean" are cut; the claim stays


class Scoring(unittest.TestCase):
    def pick_one(self, sentences, **kw):
        a = dict(ARGS, **kw)
        return p.pick(words_from(sentences), "word", a)

    def test_good_take_is_found_and_explained(self):
        cands = self.pick_one(GOOD)
        self.assertTrue(cands)
        top = cands[0]
        self.assertGreaterEqual(top["score"], 60)
        self.assertTrue(top["hook"].startswith("Nobody needs a video editor"))
        self.assertTrue(any(r.startswith("+opinion") for r in top["reasons"]))
        self.assertTrue(any("numbers" in r for r in top["reasons"]))
        self.assertEqual(set(top["components"]), set(p.WEIGHTS))

    def test_filler_heavy_rambling_ranks_below_clean_take(self):
        clean = self.pick_one(GOOD)[0]["score"]
        ramble = self.pick_one(FILLER * 3)
        if ramble:
            self.assertLess(ramble[0]["score"], clean - 15)

    def test_connective_first_sentence_is_not_a_hook(self):
        sents = ["And because of that, the whole thing fell apart in March."] + GOOD
        cands = self.pick_one(sents)
        self.assertTrue(cands)
        # the picker starts at the claim, not at the connective sentence
        self.assertFalse(cands[0]["hook"].lower().startswith("and because"))

    def test_hard_meta_never_selected(self):
        sents = ["Welcome back to the show everybody, subscribe and like the video today."] + GOOD
        for c in self.pick_one(sents):
            self.assertNotIn("welcome back", c["text"].lower())

    def test_length_window_respected(self):
        for c in self.pick_one(GOOD * 3):
            self.assertGreaterEqual(c["duration"], 15)  # snapped ends may trim a little below min_len
            self.assertLessEqual(c["b"] - c["a"], ARGS["max_len"] + 2)
        self.assertEqual(self.pick_one(GOOD[:2]), [])  # too short to be a Short

    def test_mid_thought_end_is_flagged_and_scores_lower(self):
        def score(next_sentence):
            sents = p.split_sentences(words_from(GOOD[:6] + [next_sentence]))
            w = p.build_window(sents, 0, 5, ARGS)
            return p.score_window(w, sents, ARGS)

        cont = score("and that is the part nobody wants to say out loud.")
        fresh = score("That is the part nobody wants to say out loud.")
        self.assertIn("mid-thought-end", cont["flags"])
        self.assertNotIn("mid-thought-end", fresh["flags"])
        self.assertLess(cont["score"], fresh["score"])

    def test_backchannel_is_cut_out(self):
        sents = GOOD[:3] + [("Yeah.", "S2")] + GOOD[3:]
        cands = self.pick_one(sents)
        self.assertTrue(cands)
        top = cands[0]
        self.assertNotIn("Yeah.", top["text"])
        self.assertGreaterEqual(len(top["short"]["segs"]), 2)  # two runs with the back-channel left in the gap

    def test_overlap_suppressed(self):
        cands = p.pick(words_from(GOOD * 4), "word", dict(ARGS, top=10))
        spans = [(c["a"], c["b"]) for c in cands]
        for i, x in enumerate(spans):
            for y in spans[i + 1:]:
                self.assertLessEqual(p.overlap(x, y), p.OVERLAP_MAX * min(x[1] - x[0], y[1] - y[0]) + 1e-6)

    def test_exclude_range(self):
        base = self.pick_one(GOOD)
        self.assertTrue(base)
        self.assertEqual(self.pick_one(GOOD, exclude=[(0.0, 500.0)]), [])

    def test_deterministic(self):
        a = json.dumps(self.pick_one(GOOD * 3), sort_keys=True)
        b = json.dumps(self.pick_one(GOOD * 3), sort_keys=True)
        self.assertEqual(a, b)


class ShortFragment(unittest.TestCase):
    def test_segs_convert_to_short_json_shape(self):
        args = dict(ARGS, speakers={"S1": "vincent", "S2": "mitchell"})
        cands = p.pick(words_from(GOOD), "word", args)
        short = cands[0]["short"]
        self.assertEqual(short["source"], "raw/x.mp4")
        for seg in short["segs"]:
            self.assertEqual(set(seg) - {"tile"}, {"a", "b", "layout"})
            self.assertLess(seg["a"], seg["b"])
            self.assertEqual(seg["layout"], "A")
            self.assertEqual(seg["tile"], "vincent")
        self.assertNotIn("speaker_turns", short)

    def test_two_speaker_take_gets_layout_b_turns(self):
        sents = GOOD[:3] + [("I do not agree with that at all, you still need a human in the loop for taste.", "S2")] + GOOD[3:]
        args = dict(ARGS, speakers={"S1": "vincent", "S2": "mitchell"})
        cands = p.pick(words_from(sents), "word", args)
        two = [c for c in cands if len(c["speakers"]) > 1]
        self.assertTrue(two)
        short = two[0]["short"]
        self.assertEqual(short["segs"][0]["layout"], "B")
        self.assertIn("default_speaker", short)
        self.assertTrue(all(len(t) == 3 and t[2] in ("V", "M") for t in short["speaker_turns"]))
        starts = [t[0] for t in short["speaker_turns"]]
        self.assertEqual(starts, sorted(starts))


class Snapping(unittest.TestCase):
    def test_start_lands_in_pause_before_word(self):
        a = p.snap_start(10.0, 9.0, [(9.2, 9.95)])
        self.assertGreaterEqual(a, 9.2)
        self.assertLessEqual(a, 10.0)

    def test_end_lands_in_pause_after_word(self):
        b, pause = p.snap_end(20.0, 21.5, [(20.05, 21.0)])
        self.assertGreater(b, 20.0)
        self.assertLess(b, 21.0)
        self.assertAlmostEqual(pause, 0.95, places=2)

    def test_snap_never_crosses_neighbour_words(self):
        self.assertGreaterEqual(p.snap_start(10.0, 9.95, []), 9.95)
        b, _ = p.snap_end(20.0, 20.1, [])
        self.assertLessEqual(b, 20.1)


class Judge(unittest.TestCase):
    def test_judge_reorders_and_keeps_heuristic(self):
        cands = [{"id": "t01", "score": 80.0, "text": "a", "hook": "a", "duration": 30.0},
                 {"id": "t02", "score": 70.0, "text": "b", "hook": "b", "duration": 30.0}]
        script = ("import json,sys;d=json.load(sys.stdin);"
                  "print(json.dumps({'scores':{c['id']:{'score':(100 if c['id']=='t02' else 0),'note':'x'} for c in d['candidates']}}))")
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "judge.py"
            f.write_text(script)
            out = p.apply_judge(cands, f"{sys.executable} {f}", 0.5)
        self.assertEqual(out[0]["id"], "t02")
        self.assertEqual(out[0]["heuristic_score"], 70.0)
        self.assertEqual(out[0]["score"], 85.0)

    def test_off_by_default(self):
        # pick() takes no judge argument; only main() runs one, and only with --judge-cmd
        for c in p.pick(words_from(GOOD), "word", dict(ARGS)):
            self.assertNotIn("judge", c)
            self.assertNotIn("heuristic_score", c)


class Times(unittest.TestCase):
    def test_parse_and_format(self):
        self.assertEqual(p.parse_time("1:02:03"), 3723)
        self.assertEqual(p.parse_time("37:15"), 2235)
        self.assertEqual(p.parse_time("12.5"), 12.5)
        self.assertEqual(p.fmt_time(2235), "37:15")
        self.assertEqual(p.fmt_time(3723), "1:02:03")


if __name__ == "__main__":
    unittest.main()
