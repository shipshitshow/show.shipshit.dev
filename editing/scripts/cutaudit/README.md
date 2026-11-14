# Cut audit

`audit.py` checks every cut of a finished cut list against the waveform: no clipped words, no cut inside a word, no double pause or doubled phrase at a join. It is step 2 of the edit automation, after the dead-air trim (`../trim/`). It reports and suggests; it never renders, never edits the cut list and never touches the source media. Stdlib Python plus ffmpeg (an `ffmpeg-full` build is found like `shorts/common.py` does). Pillow is optional and only draws the waveform PNGs.

Nobody listens to the output when the script runs. A PASS means the waveform and the transcript agree, not that the join sounds right: listen to every WARN and FAIL, and to a sample of the PASS cuts, before using the cuts.

```bash
python3 editing/scripts/cutaudit/audit.py <cuts> <words.json> <media> --out DIR            # report, json, adjusted EDL, PNGs
python3 editing/scripts/cutaudit/audit.py <cuts> <words.json> <media> --episode <episode>  # writes to <episode>/out/cutaudit/
python3 editing/scripts/cutaudit/audit.py short.json <clip-words.json> <media> --clip-time # Short: transcript stamped on the Short's own audio
python3 -m unittest discover -s editing/scripts/cutaudit -p 'test_*.py'                    # tests (also run in CI)
```

Exit code: 1 if any cut FAILs (`--fail-on warn` also fails on WARN), 0 otherwise.

## Why it exists

The rules come from the vault and the owner's review notes:

- `docs/show-prep/edit-style.md` and vault `brand/editing.md`: split edits are "Never mid-word", "No cut starts or ends on a filler word", "No micro-cuts under about 0.5 s; cuts closer than 2 s apart are merged", and step 10 "Full render and checks" lists "filler at cut edges".
- Vault `_admin/docs/audits/2026-11-14/editing-automation-audit.md`: "The cut audit he asks for: match every syllable in the transcript to a syllable in the waveform, and treat steady background noise (a passing car) as silence when trimming pauses." and, as item 4 of the build list, "After each chapter render: filler words at cut edges, and every transcript word matched to speech in the waveform, with steady background noise treated as silence."

## Inputs

| Argument | What it is |
|---|---|
| `cuts` | a cut list, format detected from its shape (`--format` forces one): the `trim/trim.py` EDL (`keep[]`, `cuts[]`), a `chapters.json` (`chapters[]` with `start`/`end`, `drop` chapters are skipped, `--chapter` picks one), a Short's `short.json` (`segs[]` with `a`/`b`), or generic keep ranges (a list of `[start, end]` pairs, or `{"sequences": [{"name", "pieces"}]}`). All times are source seconds. |
| `words.json` | whisper.cpp `-oj` output run with `-ml 1 -sow` (what `shorts/align.py` reads), or a list of `{w, s, e}` / `[s, e, text]`. `--clip-time` maps words stamped on a Short's own audio back to source time through its `segs`. |
| `media` | the source audio or video the cuts refer to. |

Every join between two kept pieces is a cut; the head and tail of a sequence are audited too, except where the first or last piece is the range start or end.

## What it checks

The waveform is the ground truth. Whisper stamps run late and stretched (a word is often held over the silence after it), so the audio decides and the transcript is only a hint. One ffmpeg pass gives a 5 ms RMS envelope (`astats`), the same one the trimmer uses. The quiet threshold is the room's own floor plus 12 dB, clamped to -45..-32 dB, so steady background noise counts as silence (`--noise` overrides). A word's box is the speech burst that overlaps its stamps most, clipped to the stamps; a word with no burst gets no box.

Per cut edge, measured in a +-30 ms window against the local speech level:

| Code | Level | Meaning |
|---|---|---|
| `mid-word` | FAIL | the cut lands inside a word box and speech energy continues on the kept side |
| `mid-speech` | FAIL | speech energy runs straight through the cut and no word explains it |
| `quiet-in-word` | WARN, FAIL if deep | the cut lands inside a word in a quiet dip (a stop closure, or off stamps): the word is split |
| `clipped-edge` | FAIL | the kept audio starts or ends on speech energy, or has less quiet than the 18 ms fade, so the fade eats the onset or tail |
| `click-risk` | WARN | same, on an edge with no fade (Short heads and tails): a transient click |
| `tight-pad` | WARN | under 38 ms of quiet between the cut and speech |

Per join, comparing the words kept before and after:

| Code | Level | Meaning |
|---|---|---|
| `double-pause` | WARN, FAIL at 1 s | at least 200 ms of pause on both sides of the join, adding up |
| `long-pause` | WARN | one long pause left at the join (dead air the trimmer would cut) |
| `duplicate-phrase` | FAIL | a run of three or more words (or two across the join) said on both sides |
| `doubled-word` / `restart` | WARN | a word repeated across the join, or a phrase restarted within four words |
| `filler-at-join` | WARN | the kept audio starts or ends on a filler word |

## Outputs

| File | Contents |
|---|---|
| `cut-audit.json` | schema `shipshitshow.cut-audit/1`: tool, source, thresholds, every cut with its measured values (pad, window level, local speech level, pauses), the words around it, issues and verdict, and the totals |
| `cut-audit.md` | a summary line, a table of every cut with PASS/WARN/FAIL, then one section per non-PASS cut with the numbers and the words |
| `cut-audit.nudged.edl.json` | the keep list with a suggested nudge for each failing edge, NOT applied: a new boundary within +-120 ms, at a quiet frame outside every word box and never past a neighbouring word, with a re-check verdict. Review it, then rebuild if you agree. |
| `png/*.png` | one waveform per failing edge (`--png fail`, `warn` adds WARN, `none` skips): the cut line, word boxes, energy, the quiet threshold and the nudge. Needs Pillow; skipped without it. |

The script never overwrites the source, never writes inside a `final` folder, and refuses to replace its own outputs unless `--overwrite` is given.

## Limits

- It audits the planned cut list against the source waveform. J/L-cut audio offsets and any later re-render are not modelled.
- Word boxes come from the transcript you pass. A wrong or late transcript moves the boxes; the energy checks (`mid-speech`, `clipped-edge`) do not depend on them.
- Background speech or music under the voice reads as speech energy. Steady noise reads as silence; a changing noise (a passing car) can read as either.
- It cannot judge whether a cut sounds natural.
