# Revisions log and b-roll credits

`revlog.py` closes two items of the editing rulebook (vault `brand/editing.md`: "Record kit revision, logo hash, fonts, caption style and approved deviations with the edit" and "versioned outputs with a revisions log, a privacy sweep before upload") and the matching line of the 2026-11-14 editing-automation audit: "Versioned outputs, with a revisions log and a credits file for stock b-roll." Stdlib Python plus ffmpeg/ffprobe. Run it on the Mac Studio.

```bash
python3 editing/scripts/revisions/revlog.py add     --episode-dir <episode> --note "tightened intro, -14 LUFS" --edl <episode>/out/trim/edl.json --output <episode>/out/video/final.mp4 --field kit=v2
python3 editing/scripts/revisions/revlog.py show    --episode-dir <episode> [v2] [--json]
python3 editing/scripts/revisions/revlog.py diff    --episode-dir <episode> v1 v2 [--json]
python3 editing/scripts/revisions/revlog.py credits --episode-dir <episode> [--plan plan.json] [--scan-folder] [--strict]
python3 -m unittest discover -s editing/scripts/revisions -p 'test_*.py'   # tests (also run in CI)
```

`<episode>` is the episode folder or its id (`<YYMMDD>`, via `workspace.py`). Everything is written under `<episode>/out/` (`--out-dir` to change), never into this repository.

## Revisions log

`add` appends one record to `out/revisions.jsonl` and re-renders `out/revisions.md`. The log is append-only: versions count up (`v1`, `v2`, ...), writes take a file lock, and each record stores the sha256 of the previous line, so `show` warns when earlier history was edited. A record holds:

| Field | Content |
|---|---|
| `version`, `timestamp` | `v<N>`, UTC |
| `note`, `fields` | free text, plus any `--field key=value` (JSON values allowed) |
| `inputs` | path and sha256 of the source recording (`chapters.json` `source`, else a `short.json` `source`, else `raw/<id>.mp4`, via `workspace.graded_source`), the EDL, `chapters.json` and every `out/shorts/*/short.json`; `--input name=PATH` adds more; `--no-source-hash` records size and mtime instead of hashing a large source |
| `tools` | short git commit of these scripts (and whether they have uncommitted changes), ffmpeg version, Python version |
| `outputs` | per `--output`: path, sha256, size, duration, integrated LUFS and true peak (ffmpeg `ebur128`) |
| `edl` | cut count and total removed seconds, when `--edl` is given |

The EDL summary is tolerant: `{"cuts": [{"start", "end", "reason"}]}` (also `removed`, `drops`, `silences`; range keys `start/end`, `in/out`, `a/b`, `from/to`; seconds or `MM:SS`), `{"keep": [[a, b], ...]}` (also `segments`, `clips`; the gaps between kept ranges are the cuts, and the tail counts when the file carries a source duration), a bare list of either, and a `chapters.json`-style `{"chapters": [{"drop": [...]}]}`. Overlapping cuts count once. An unrecognised file is logged as `format: unknown` instead of failing the revision.

`diff vN vM` compares two records: which inputs changed by hash (and which were added or removed), each output's hash, duration and loudness deltas, tool version changes and EDL count changes.

## B-roll credits

`credits` collects every b-roll clip the episode uses from `chapters.json` (`broll` lists on the file or on a chapter), every `out/shorts/*/short.json` `broll` entry (`{"asset": ...}`), and optionally `--plan FILE` (plan JSON whose overlays or events carry `"beat": "broll"` or `"kind": "broll"` with a `name`, `asset` or `path`). It finds each clip under the episode's `out/video/assets/broll/<name>/` (or `--broll-dir`), looks for sidecar metadata, and writes `out/credits.md`: a YouTube-description-ready block, an `UNVERIFIED` list, and a per-clip table. `--scan-folder` also lists clips that exist in the folder but no edit references; `--strict` exits 1 when anything is `UNVERIFIED`.

A clip is credited only with a license and a creator (or `"original": true`, for footage the show made itself). Anything else is `UNVERIFIED`; nothing is inferred from file names, folder names or the web, and no credit is ever invented. Resolve an `UNVERIFIED` clip by adding sidecar metadata and re-running.

### Sidecar schema

Looked up next to the clip, nearest first: `<clip>.json` (or `<name>.json`), `<name>.license.txt`, then a `credits.json` index in the clip's folder or any parent up to the b-roll folder.

```json
{
  "creator": "Sam Example",
  "source_url": "https://example.com/videos/harbor-at-dusk",
  "license": "CC BY 4.0",
  "license_url": "https://creativecommons.org/licenses/by/4.0/",
  "title": "Harbor at dusk",
  "attribution_required": true,
  "attribution": "optional exact line to paste instead of the generated one",
  "original": false
}
```

| Key | Required | Meaning |
|---|---|---|
| `creator` | yes, unless `original` | who made it (`author`, `artist` accepted) |
| `license` | yes, unless `original` | license name or terms (`CC BY 4.0`, `CC0`, `Pexels License`, ...) |
| `source_url` | no, noted when absent | where it came from (`url`, `source`, `link` accepted) |
| `license_url`, `title` | no | added to the credit line |
| `attribution_required` | no | `false` keeps the clip out of the description block (CC0 and similar) while still recording it |
| `attribution` | no | exact credit text; wins over the generated line |
| `original` | no | `true` for the show's own footage; counts as credited |

`<name>.license.txt` takes `Creator:`, `Source:`, `License:` and `Title:` lines (a single bare line is read as the license). A `credits.json` index is `{"clips": {"<name>": {...schema above...}}}`, a plain `{"<name>": {...}}`, or a list of entries with a `clip` or `name` key.

Generic `credits.md` excerpt:

```text
B-roll credits:
"Harbor at dusk" by Sam Example - https://example.com/videos/harbor-at-dusk - CC BY 4.0
```
