#!/usr/bin/env python3
"""Create, audit and promote local episode media projects without publishing anything."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

# Media lives outside the repository, in the brand's content tree. Override the
# root (for tests or another machine) with SHIPSHITSHOW_CONTENT_ROOT; labs follow
# it unless SHIPSHITSHOW_LABS_ROOT is set. REPO is the checkout this script runs
# from (any worktree works): it only resolves the tracked show data.
REPO = Path(__file__).resolve().parents[2]
ROOT = Path(os.environ.get("SHIPSHITSHOW_CONTENT_ROOT", "~/content/brands/shipshitshow")).expanduser().resolve()
LABS = Path(os.environ["SHIPSHITSHOW_LABS_ROOT"]).expanduser().resolve() if os.environ.get("SHIPSHITSHOW_LABS_ROOT") else ROOT.parent.parent / "_labs" / ROOT.name
FOLDERS = ("raws", "assets", "outputs", "versions", "final")
EPISODE_FOLDERS = ("raw", "out", "prompts")
# An episode is projects/<YYYY-MM-DD>_<YYMMDD> with episode.json and the shared
# recording in raw/. Each deliverable inside it is a project under out/:
# out/video or out/shorts/<slug>. Project ids stay <YYMMDD>/video,
# <YYMMDD>/shorts/<slug> and _labs/<slug>. Experiments live in LABS/<slug>.
EPISODE = re.compile(r"[0-9]{6}")
EPISODE_DIR = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}_([0-9]{6})")
DELIVERABLE = re.compile(r"([0-9]{6})/(video|shorts/[a-z0-9][a-z0-9-]*)")
LAB = re.compile(r"_labs/[a-z0-9][a-z0-9-]*")


def episode_dir(episode_id: str, create: bool = False) -> Path:
    """Folder of an episode id, e.g. 261103 -> projects/2026-11-03_261103."""
    matches = sorted((ROOT / "projects").glob(f"*_{episode_id}")) if (ROOT / "projects").is_dir() else []
    matches = [path for path in matches if EPISODE_DIR.fullmatch(path.name) and path.is_dir()]
    if matches:
        return matches[0]
    if not create:
        raise ValueError(f"No episode folder for {episode_id} under {ROOT / 'projects'}")
    return ROOT / "projects" / f"20{episode_id[:2]}-{episode_id[2:4]}-{episode_id[4:]}_{episode_id}"


def graded_source(path: Path) -> Path:
    """Colour-corrected sibling of a recording (<stem>.graded<suffix>, written by grade/grade.py) when it is current.

    A corrected file older than the recording is stale: the recording is returned and a note goes to stderr.
    """
    graded = path.with_name(f"{path.stem}.graded{path.suffix}")
    if not (graded.exists() and path.exists()):
        return path
    if graded.stat().st_mtime < path.stat().st_mtime:
        print(f"note: {graded.name} is older than {path.name}; using the uncorrected recording", file=sys.stderr)
        return path
    return graded


def project_path(slug: str) -> Path:
    if DELIVERABLE.fullmatch(slug):
        episode_id, rest = slug.split("/", 1)
        return episode_dir(episode_id, create=True) / "out" / rest
    if LAB.fullmatch(slug):
        return LABS / slug.removeprefix("_labs/")
    raise ValueError("Use <YYMMDD>/video, <YYMMDD>/shorts/<slug> or _labs/<slug> (lowercase, digits and hyphens).")


def slug_of(project: Path) -> str:
    if project.is_relative_to(LABS):
        return "_labs/" + project.relative_to(LABS).as_posix()
    episode, _, rest = project.relative_to(ROOT / "projects").as_posix().partition("/out/")
    return f"{EPISODE_DIR.fullmatch(episode).group(1)}/{rest}"


def discover_projects() -> list[Path]:
    """Every deliverable and lab holding a project.json, skipping copies inside project folders and archives."""
    found = []
    for episode in discover_episodes():
        for path in [episode / "out" / "video", *sorted((episode / "out" / "shorts").glob("*"))]:
            if (path / "project.json").is_file() and not path.name.startswith("_"):
                found.append(path)
    if LABS.is_dir():
        for path in LABS.rglob("project.json"):
            parts = path.relative_to(LABS).parts[:-1]
            if not set(parts) & set(FOLDERS) and not any(part.startswith("_archive") for part in parts):
                found.append(path.parent)
    return sorted(found)


def discover_episodes() -> list[Path]:
    base = ROOT / "projects"
    return sorted(path for path in base.iterdir() if path.is_dir() and EPISODE_DIR.fullmatch(path.name)) if base.is_dir() else []


def episode_of(project: Path) -> Path | None:
    match = DELIVERABLE.fullmatch(slug_of(project))
    return episode_dir(match.group(1)) if match else None


def ensure_episode(episode_id: str) -> Path:
    """Create projects/<date>_<YYMMDD> with raw/, out/ and episode.json unless it already exists."""
    episode = episode_dir(episode_id, create=True)
    if (episode / "episode.json").exists():
        return episode
    date = f"20{episode_id[:2]}-{episode_id[2:4]}-{episode_id[4:]}"
    show_data = f"apps/app/data/livestream/{date}"
    (episode / "raw").mkdir(parents=True, exist_ok=True)
    (episode / "out").mkdir(exist_ok=True)
    write_json(episode / "episode.json", {
        "schema_version": 1,
        "id": episode_id,
        "recording_date": date,
        "show_data": show_data if (REPO / show_data).is_dir() else None,
        "recording": None,
        "youtube": {"livestream": None, "video": None, "shorts": {}},
        "transcripts": [],
    })
    return episode


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n")


def probe(path: Path) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


def check_archive(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        metadata = json.loads(archive.read("metadata.json"))
        document = archive.read(metadata["project"]["path"])
        if hashlib.sha256(document).hexdigest() != metadata["project"]["sha256"]:
            raise ValueError(f"Invalid document digest: {path}")
        doc = json.loads(document)
        for asset in metadata.get("assets", {}).values():
            if archive.getinfo(asset["path"]).file_size != asset["byteLength"]:
                raise ValueError(f"Missing or truncated packaged asset: {path}")
        def inspect(value):
            if isinstance(value, dict):
                if "assetId" in value and value["assetId"] not in metadata.get("assets", {}):
                    raise ValueError(f"Unknown native asset {value['assetId']}: {path}")
                for child in value.values():
                    inspect(child)
            elif isinstance(value, list):
                for child in value:
                    inspect(child)
        inspect(doc)


def copy_bundle(source: Path, destination: Path) -> None:
    shutil.copytree(source, destination)
    # Snapshot folders are one level deeper than outputs/final. Retain local
    # Markdown links to files outside the copied bundle.
    for original in source.rglob("*.md"):
        copied = destination / original.relative_to(source)
        def relocate(match):
            target = match.group(1)
            if "://" in target or target.startswith(("#", "/", "<")):
                return match.group(0)
            path, separator, fragment = target.partition("#")
            resolved = (original.parent / path).resolve()
            if resolved.is_relative_to(source.resolve()):
                resolved = destination / resolved.relative_to(source.resolve())
            relative = os.path.relpath(resolved, copied.parent)
            return "](" + relative + (separator + fragment if separator else "") + ")"
        copied.write_text(re.sub(r"\]\(([^)]+)\)", relocate, original.read_text()))


def audit_episode(episode: Path, report: dict) -> None:
    name = episode.name
    episode_id = EPISODE_DIR.fullmatch(name).group(1)
    try:
        data = json.loads((episode / "episode.json").read_text())
    except (ValueError, OSError) as error:
        report["errors"].append(f"{name}: invalid or missing episode.json ({error})")
        return
    if data.get("id") != episode_id:
        report["errors"].append(f"{name}: episode.json id is {data.get('id')!r}, expected {episode_id}")
    if data.get("recording_date") and not name.startswith(data["recording_date"]):
        report["errors"].append(f"{name}: recording_date {data['recording_date']} does not match the folder")
    if not (episode / "raw").is_dir():
        report["errors"].append(f"{name}: missing raw")
    if data.get("recording") and not (episode / data["recording"]).is_file():
        report["errors"].append(f"{name}: missing recording {data['recording']}")
    # Repository links are relative to the repository root.
    if data.get("show_data") and not (REPO / data["show_data"]).is_dir():
        report["errors"].append(f"{name}: missing show data {data['show_data']}")
    for transcript in data.get("transcripts", []):
        if not (REPO / transcript).is_file() and not (episode / transcript).is_file():
            report["errors"].append(f"{name}: missing transcript {transcript}")
    for entry in sorted(episode.iterdir()):
        if entry.is_dir() and entry.name not in EPISODE_FOLDERS and not entry.name.startswith("_archive"):
            report["errors"].append(f"{name}: unexpected folder {entry.name}")
    report["episodes"].append(name)


def audit(projects: list[Path], episodes: list[Path]) -> dict:
    report = {"episodes": [], "projects": [], "errors": []}
    for episode in episodes:
        audit_episode(episode, report)
    for project in projects:
        slug = slug_of(project)
        item = {"project": slug, "archives_checked": 0, "manifests_checked": 0}
        for folder in FOLDERS:
            if not (project / folder).is_dir():
                report["errors"].append(f"{slug}: missing {folder}")
        for path in project.rglob("*.tsrct"):
            try:
                check_archive(path)
                item["archives_checked"] += 1
            except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
                report["errors"].append(str(error))
        manifests = [project / "project.json", project / "outputs" / "manifest.json", project / "final" / "manifest.json"]
        manifests.extend((project / "versions").glob("*/manifest.json"))
        for manifest in manifests:
            if not manifest.exists():
                continue
            try:
                data = json.loads(manifest.read_text())
                for name, relative in data.get("artifacts", {}).items():
                    path = project / relative
                    if not path.resolve().is_relative_to(project.resolve()) or not path.is_file():
                        report["errors"].append(f"{slug}: missing/escaping {name}: {relative}")
                for name, absolute in data.get("external_artifacts", {}).items():
                    if not Path(absolute).is_file():
                        report["errors"].append(f"{slug}: missing external {name}")
                item["manifests_checked"] += 1
            except (ValueError, OSError) as error:
                report["errors"].append(f"{manifest}: {error}")
        for path in project.rglob("*"):
            if path.is_symlink() and not path.exists():
                report["errors"].append(f"Broken symlink: {path}")
        report["projects"].append(item)
    return report


def initialize(slug: str, kind: str | None) -> None:
    project = project_path(slug)
    match = DELIVERABLE.fullmatch(slug)
    if match:
        ensure_episode(match.group(1))
        kind = kind or ("recap" if match.group(2) == "video" else "short")
    kind = kind or "design"
    project.parent.mkdir(parents=True, exist_ok=True)
    project.mkdir()  # Fail rather than merge with an existing project.
    for folder in FOLDERS:
        (project / folder).mkdir()
    (project / "outputs" / "work").mkdir()
    (project / "outputs" / "previews").mkdir()
    write_json(project / "project.json", {"schema_version": 1, "id": slug, "kind": kind, "status": "draft", "current_revision": None, "artifacts": {}})
    print(project)


def artifact_sources(project: Path, manifest: dict) -> dict[str, Path]:
    outputs = (project / "outputs").resolve()
    sources = {}
    for name, relative in manifest.get("artifacts", {}).items():
        source = project / relative
        if not source.resolve().is_relative_to(outputs) or not source.is_file():
            raise ValueError(f"Artifact must exist inside outputs: {relative}")
        if source.name in sources:
            raise ValueError("Deliverable basenames must be unique.")
        sources[source.name] = source
    if "video.mp4" not in sources:
        raise ValueError("A video bundle requires video.mp4.")
    return sources


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.utcoffset() is None:
        raise ValueError("Use an ISO 8601 timestamp with an explicit UTC offset.")
    return parsed


def revision_of(manifest: dict) -> str:
    revision = manifest.get("revision", "")
    if not re.fullmatch(r"v[0-9]{3,}", revision):
        raise ValueError("Use a revision such as v004.")
    return revision


def sign_off(slug: str, reviewer: str, evidence: str, reviewed_sha256: str, approval_time: str | None) -> None:
    """Record explicit human approval of the revision and exact video they watched."""
    project = project_path(slug)
    path = project / "outputs" / "manifest.json"
    manifest = json.loads(path.read_text())
    if manifest.get("status") not in ("draft", "ready"):
        raise ValueError("Only a draft or ready candidate can receive sign-off.")
    approval = {
        "revision": revision_of(manifest),
        "reviewer": reviewer.strip(),
        "evidence": evidence.strip(),
        "video_sha256": reviewed_sha256,
    }
    if not approval["reviewer"] or not approval["evidence"]:
        raise ValueError("Provide the human reviewer and their explicit watch-and-listen approval.")
    sources = artifact_sources(project, manifest)
    if sha256(sources["video.mp4"]) != reviewed_sha256:
        raise ValueError("The candidate differs from the video the reviewer approved.")
    previous = manifest.get("human_review", {})
    if manifest["status"] == "ready" and all(previous.get(key) == value for key, value in approval.items()):
        print(previous["approved_at"])
        return
    now = datetime.now(timezone.utc)
    approved_at = timestamp(approval_time) if approval_time else now
    if approved_at > now:
        raise ValueError("Approval cannot be in the future.")
    approval["approved_at"] = approved_at.isoformat(timespec="seconds")
    manifest.update(status="ready", human_review=approval)
    check_delivery(project, manifest, sources)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as staged:
        staged_path = Path(staged.name)
    try:
        write_json(staged_path, manifest)
        staged_path.replace(path)
    finally:
        staged_path.unlink(missing_ok=True)
    print(approval["approved_at"])


def check_delivery(project: Path, manifest: dict, sources: dict[str, Path]) -> None:
    review = manifest.get("human_review", {})
    if (
        review.get("revision") != manifest["revision"]
        or not review.get("reviewer", "").strip()
        or not review.get("evidence", "").strip()
    ):
        raise ValueError("Record human sign-off on this exact revision before delivery.")
    approved_at = timestamp(review["approved_at"])
    turnaround = manifest.get("turnaround")
    if turnaround is not None:
        if not timestamp(turnaround["ingest_at"]) <= timestamp(turnaround["first_cut_at"]) <= approved_at:
            raise ValueError("Turnaround timestamps must follow ingest, first cut, then approval.")

    method = manifest.get("render_method", "tesseract")
    if method == "tesseract":
        if "project.tsrct" not in sources:
            raise ValueError("A Tesseract delivery requires project.tsrct.")
        check_archive(sources["project.tsrct"])
    elif method == "ffmpeg":
        if "ffmpeg-handoff.json" not in sources:
            raise ValueError("An FFmpeg delivery requires ffmpeg-handoff.json.")
        handoff = json.loads(sources["ffmpeg-handoff.json"].read_text())
        recipe = (project / handoff["recipe"]).resolve()
        if not recipe.is_relative_to((project / "assets").resolve()) or not recipe.is_file():
            raise ValueError("Keep the FFmpeg recipe under the project's assets directory.")
        if sha256(recipe) != handoff["recipe_sha256"]:
            raise ValueError("The FFmpeg recipe has changed since the rebuild.")
        timestamp(handoff["rebuild_verified_at"])
        if handoff["rebuilt_video_sha256"] != review.get("video_sha256"):
            raise ValueError("The rebuild must match the exact reviewed export.")
    else:
        raise ValueError(f"Unknown render method: {method}")


def promote(slug: str) -> None:
    """Stage a verified bundle, snapshot it, then swap the stable final directory."""
    project = project_path(slug)
    outputs, final = project / "outputs", project / "final"
    manifest = json.loads((outputs / "manifest.json").read_text())
    if manifest.get("status") != "ready":
        raise ValueError("Record human sign-off on the final export before promotion.")
    revision = revision_of(manifest)
    snapshot = project / "versions" / revision
    if snapshot.exists():
        raise ValueError("Revision already exists; choose a new revision, never overwrite history.")
    sources = artifact_sources(project, manifest)
    check_delivery(project, manifest, sources)
    media = probe(sources["video.mp4"])
    if not any(s.get("codec_type") == "video" for s in media["streams"]):
        raise ValueError("video.mp4 has no video stream.")
    for absolute in manifest.get("external_artifacts", {}).values():
        if not Path(absolute).is_file():
            raise ValueError("External artifact is missing.")
    # An existing final must have its own snapshot before it is replaced.
    if any(final.iterdir()):
        old_manifest = json.loads((final / "manifest.json").read_text())
        old_revision = old_manifest.get("revision", "")
        if not re.fullmatch(r"v[0-9]{3,}", old_revision):
            raise ValueError("Current final has no valid revision.")
        old_snapshot = project / "versions" / old_revision
        if not old_snapshot.exists():
            copy_bundle(final, old_snapshot)
            snapshot_manifest = dict(old_manifest, artifacts={name: f"versions/{old_revision}/" + Path(relative).name for name, relative in old_manifest.get("artifacts", {}).items()})
            write_json(old_snapshot / "manifest.json", snapshot_manifest)
        else:
            for name in old_manifest.get("artifacts", {}).values():
                current, archived = project / name, old_snapshot / Path(name).name
                if not archived.is_file():
                    raise ValueError("Current final snapshot is incomplete; preserve it before promotion.")
                if current.suffix in (".mp4", ".tsrct", ".srt", ".vtt", ".txt", ".csv"):
                    if sha256(current) != sha256(archived):
                        raise ValueError("Final differs from its snapshot; preserve the change before promotion.")
    stage = Path(tempfile.mkdtemp(prefix=".delivery-", dir=project))
    backup = project / ".previous-final"
    if backup.exists():
        stage.rmdir()
        raise ValueError("Unresolved previous final backup; inspect it before promotion.")
    try:
        for name, source in sources.items():
            shutil.copy2(source, stage / name)
        if sha256(stage / "video.mp4") != manifest["human_review"]["video_sha256"]:
            raise ValueError("The export changed after sign-off. Review the current revision before delivery.")
        final_manifest = dict(manifest, status="exported")
        final_manifest["artifacts"] = {name: "final/" + (project / relative).name for name, relative in manifest["artifacts"].items()}
        write_json(stage / "manifest.json", final_manifest)
        copy_bundle(stage, snapshot)
        snapshot_manifest = dict(final_manifest, artifacts={name: f"versions/{revision}/" + (project / relative).name for name, relative in manifest["artifacts"].items()})
        write_json(snapshot / "manifest.json", snapshot_manifest)
        final.rename(backup)
        try:
            stage.rename(final)
        except OSError:
            backup.rename(final)
            raise
        shutil.rmtree(backup)
        state = json.loads((project / "project.json").read_text())
        state.update(current_revision=revision, status="exported", artifacts=final_manifest["artifacts"])
        write_json(project / "project.json", state)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    print(final / "video.mp4")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, epilog=f"Media root: {ROOT} (SHIPSHITSHOW_CONTENT_ROOT); labs: {LABS} (SHIPSHITSHOW_LABS_ROOT).")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("init"); create.add_argument("project"); create.add_argument("--kind", choices=("recap", "short", "branding", "design"))
    inspect = sub.add_parser("audit"); inspect.add_argument("--project")
    review = sub.add_parser("sign-off", help="Record explicit approval after a human watches and listens.")
    review.add_argument("project")
    review.add_argument("--reviewer", required=True)
    review.add_argument("--evidence", required=True, help="Reference to the human's explicit approval.")
    review.add_argument("--sha256", required=True, help="SHA-256 of the exact export they reviewed.")
    review.add_argument("--approved-at", help="Approval timestamp with UTC offset when recording an earlier decision.")
    publish = sub.add_parser("promote"); publish.add_argument("project")
    args = parser.parse_args()
    try:
        if args.command == "init":
            initialize(args.project, args.kind)
        elif args.command == "sign-off":
            sign_off(args.project, args.reviewer, args.evidence, args.sha256, args.approved_at)
        elif args.command == "promote":
            promote(args.project)
        else:
            if args.project:
                projects = [project_path(args.project)]
                episodes = [episode] if (episode := (episode_of(projects[0]) if DELIVERABLE.fullmatch(args.project) else None)) else []
            else:
                projects, episodes = discover_projects(), discover_episodes()
            report = audit(projects, episodes)
            print(json.dumps(report, indent=2))
            if report["errors"]:
                raise SystemExit(1)
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        parser.exit(1, str(error) + "\n")


if __name__ == "__main__":
    main()
