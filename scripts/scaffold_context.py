#!/usr/bin/env python3
"""Create an evidence-backed Web Design Kit from the bundled template."""

from __future__ import annotations

import argparse
import re
import shutil
from datetime import date
from pathlib import Path


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "web-design-kit"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--description", default="Reusable evidence-backed Web Design Kit.")
    parser.add_argument("--slug")
    args = parser.parse_args()

    destination = args.destination.expanduser().resolve()
    if destination.exists() and any(destination.iterdir()):
        parser.error(f"destination is not empty: {destination}")

    template = Path(__file__).resolve().parents[1] / "assets" / "context-template"
    if not template.is_dir():
        parser.error(f"template is missing: {template}")

    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(template, destination, dirs_exist_ok=True)
    (destination / "references").mkdir(exist_ok=True)
    (destination / "sources").mkdir(exist_ok=True)

    replacements = {
        "{{NAME}}": args.name,
        "{{DESCRIPTION}}": args.description,
        "{{SLUG}}": args.slug or slugify(args.name),
        "{{DATE}}": date.today().isoformat(),
    }
    for path in destination.iterdir():
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for source, target in replacements.items():
            text = text.replace(source, target)
        path.write_text(text, encoding="utf-8")

    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
