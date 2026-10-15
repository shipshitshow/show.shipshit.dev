#!/usr/bin/env python3
"""Create, audit and promote local episode media projects without publishing anything."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
FOLDERS = ("raws", "assets", "outputs", "versions", "final")
# An episode is projects/<YYMMDD> with episode.json and the shared recording in
# raws/. Each deliverable inside it is a project: <YYMMDD>/video or
# <YYMMDD>/shorts/<slug>. Experiments are _labs/<slug> at the workspace root.
EPISODE = re.compile(r"[0-9]{6}")
DELIVERABLE = re.compile(r"([0-9]{6})/(video|shorts/[a-z0-9][a-z0-9-]*)")
LAB = re.compile(r"_labs/[a-z0-9][a-z0-9-]*")


def project_path(slug: str) -> Path:
    if DELIVERABLE.fullmatch(slug):
        return ROOT / "projects" / slug
    if LAB.fullmatch(slug):
        return ROOT / slug
    raise ValueError("Use <YYMMDD>/video, <YYMMDD>/shorts/<slug> or _labs/<slug> (lowercase, digits and hyphens).")


def slug_of(project: Path) -> str:
    relative = project.relative_to(ROOT).as_posix()
    return relative.removeprefix("projects/")


def discover_projects() -> list[Path]:
    """Every folder holding a project.json, skipping copies inside project folders and archives."""
    found = []
    for base in (ROOT / "projects", ROOT / "_labs"):
        if not base.is_dir():
            continue
        for path in base.rglob("project.json"):
            parts = path.relative_to(base).parts[:-1]
            if not set(parts) & set(FOLDERS) and not any(part.startswith("_archive") for part in parts):
                found.append(path.parent)
    return sorted(found)


def discover_episodes() -> list[Path]:
    base = ROOT / "projects"
    return sorted(path for path in base.iterdir() if path.is_dir() and EPISODE.fullmatch(path.name)) if base.is_dir() else []


def episode_of(project: Path) -> Path | None:
    match = DELIVERABLE.fullmatch(slug_of(project))
    return ROOT / "projects" / match.group(1) if match else None


def ensure_episode(episode_id: str) -> Path:
    """Create projects/<YYMMDD> with raws/ and episode.json unless it already exists."""
    episode = ROOT / "projects" / episode_id
    if (episode / "episode.json").exists():
        return episode
    date = f"20{episode_id[:2]}-{episode_id[2:4]}-{episode_id[4:]}"
    show_data = f"apps/app/data/livestream/{date}"
    (episode / "raws").mkdir(parents=True, exist_ok=True)
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
    try:
        data = json.loads((episode / "episode.json").read_text())
    except (ValueError, OSError) as error:
        report["errors"].append(f"{name}: invalid or missing episode.json ({error})")
        return
    if data.get("id") != name:
        report["errors"].append(f"{name}: episode.json id is {data.get('id')!r}")
    if not (episode / "raws").is_dir():
        report["errors"].append(f"{name}: missing raws")
    if data.get("recording") and not (episode / data["recording"]).is_file():
        report["errors"].append(f"{name}: missing recording {data['recording']}")
    # Repository links are relative to the repository root.
    if data.get("show_data") and not (REPO / data["show_data"]).is_dir():
        report["errors"].append(f"{name}: missing show data {data['show_data']}")
    for transcript in data.get("transcripts", []):
        if not (REPO / transcript).is_file() and not (episode / transcript).is_file():
            report["errors"].append(f"{name}: missing transcript {transcript}")
    for entry in sorted(episode.iterdir()):
        if entry.is_dir() and entry.name not in ("raws", "video", "shorts") and not entry.name.startswith("_archive"):
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


def promote(slug: str) -> None:
    """Stage a verified bundle, snapshot it, then swap the stable final directory."""
    project = project_path(slug)
    outputs, final = project / "outputs", project / "final"
    manifest = json.loads((outputs / "manifest.json").read_text())
    if manifest.get("status") != "ready":
        raise ValueError("outputs/manifest.json must mark this bundle ready after review.")
    revision = manifest.get("revision", "")
    if not re.fullmatch(r"v[0-9]{3,}", revision):
        raise ValueError("Use a revision such as v004.")
    snapshot = project / "versions" / revision
    if snapshot.exists():
        raise ValueError("Revision already exists; choose a new revision, never overwrite history.")
    sources = {}
    for name, relative in manifest.get("artifacts", {}).items():
        source = project / relative
        if not source.resolve().is_relative_to(outputs.resolve()) or not source.is_file():
            raise ValueError(f"Artifact must exist inside outputs: {relative}")
        if source.name in sources:
            raise ValueError("Deliverable basenames must be unique.")
        sources[source.name] = source
    if not {"video.mp4", "project.tsrct"}.issubset(sources):
        raise ValueError("A video bundle requires video.mp4 and project.tsrct.")
    check_archive(sources["project.tsrct"])
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
                    def digest(file):
                        with file.open("rb") as stream:
                            return hashlib.file_digest(stream, "sha256").digest()
                    if digest(current) != digest(archived):
                        raise ValueError("Final differs from its snapshot; preserve the change before promotion.")
    stage = Path(tempfile.mkdtemp(prefix=".delivery-", dir=project))
    backup = project / ".previous-final"
    if backup.exists():
        stage.rmdir()
        raise ValueError("Unresolved previous final backup; inspect it before promotion.")
    try:
        for name, source in sources.items():
            shutil.copy2(source, stage / name)
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
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("init"); create.add_argument("project"); create.add_argument("--kind", choices=("recap", "short", "branding", "design"))
    inspect = sub.add_parser("audit"); inspect.add_argument("--project")
    publish = sub.add_parser("promote"); publish.add_argument("project")
    args = parser.parse_args()
    try:
        if args.command == "init":
            initialize(args.project, args.kind)
        elif args.command == "promote":
            promote(args.project)
        else:
            if args.project:
                projects = [project_path(args.project)]
                episodes = [episode] if (episode := episode_of(projects[0])) else []
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
