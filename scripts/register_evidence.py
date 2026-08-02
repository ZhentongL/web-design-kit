#!/usr/bin/env python3
"""Copy one healthy page snapshot into a Web Design Kit and register it."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import date
from pathlib import Path

from inspect_page_snapshot import inspect_snapshot, load_snapshot


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, data: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("package", type=Path)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--page", default="")
    parser.add_argument("--state", default="")
    parser.add_argument("--expect-text", action="append", default=[])
    args = parser.parse_args()

    package = args.package.expanduser().resolve()
    source = args.snapshot.expanduser().resolve()
    manifest_path = package / "context-manifest.json"
    if not manifest_path.is_file():
        parser.error(f"manifest is missing: {manifest_path}")
    if not source.is_file():
        parser.error(f"snapshot is missing: {source}")

    report = inspect_snapshot(source, args.expect_text)
    if report["result"] != "usable":
        parser.error("snapshot is blocked: " + "; ".join(report["errors"]))
    raw = load_snapshot(source)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    digest = sha256(source)
    for item in manifest.get("evidence", []):
        if item.get("sha256") == digest:
            print(f"duplicate:{item['id']}")
            return 0

    captured = str(raw.get("capturedAt", ""))
    captured_date = captured[:10] if len(captured) >= 10 else date.today().isoformat()
    prefix = f"ev-{captured_date.replace('-', '')}-"
    used = [item.get("id", "") for item in manifest.get("evidence", [])]
    number = 1
    while f"{prefix}{number:03d}" in used:
        number += 1
    evidence_id = f"{prefix}{number:03d}"

    destination_folder = package / "sources"
    destination_folder.mkdir(exist_ok=True)
    destination = destination_folder / f"{evidence_id}.json"
    shutil.copy2(source, destination)
    relative = destination.relative_to(package).as_posix()

    viewport = report["page"]["viewport"]
    viewport_text = ""
    if viewport["width"] and viewport["height"]:
        viewport_text = f"{viewport['width']}x{viewport['height']}"
        if viewport["device_pixel_ratio"]:
            viewport_text += f"@{viewport['device_pixel_ratio']}x"

    item = {
        "id": evidence_id,
        "type": "page-snapshot",
        "file": relative,
        "sha256": digest,
        "page": args.page or report["page"]["title"],
        "state": args.state,
        "viewport": viewport_text,
        "captured_at": captured or captured_date,
        "snapshot": {
            "schema": report["schema"],
            "url": report["page"]["url"],
            "frames": report["frames"],
            "nodes": report["nodes"],
            "stylesheets": report["stylesheets"],
        },
    }
    manifest.setdefault("evidence", []).append(item)
    manifest["updated_at"] = date.today().isoformat()
    write_json(manifest_path, manifest)

    evidence_md = package / "evidence.md"
    if not evidence_md.is_file():
        evidence_md.write_text(
            "# Evidence Registry\n\n"
            "| ID | Type | Page | State | Viewport | File | Captured |\n"
            "|---|---|---|---|---|---|---|\n",
            encoding="utf-8",
        )
    with evidence_md.open("a", encoding="utf-8") as handle:
        values = [
            evidence_id,
            "page-snapshot",
            item["page"],
            item["state"],
            viewport_text,
            relative,
            captured or captured_date,
        ]
        handle.write("| " + " | ".join(value.replace("|", "\\|") for value in values) + " |\n")

    print(evidence_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
