#!/usr/bin/env python3
"""Validate a browser page snapshot before Web Design Kit extraction."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SUPPORTED_SCHEMA = "singlefile-demo-baseline.browser-snapshot.v1"


def load_snapshot(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("snapshot root must be an object")
    return data


def contains_text(value: Any, expected: str) -> bool:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"text", "title", "aria-label", "placeholder", "value"}:
                if isinstance(child, str) and expected in child:
                    return True
            if contains_text(child, expected):
                return True
    elif isinstance(value, list):
        return any(contains_text(child, expected) for child in value)
    return False


def inspect_snapshot(path: Path, expected_texts: list[str] | None = None) -> dict[str, Any]:
    expected_texts = expected_texts or []
    data = load_snapshot(path)
    page = data.get("page") if isinstance(data.get("page"), dict) else {}
    frames = data.get("frames") if isinstance(data.get("frames"), dict) else {}
    limits = data.get("limits") if isinstance(data.get("limits"), dict) else {}
    assets = data.get("assets") if isinstance(data.get("assets"), dict) else {}
    tokens = data.get("tokens") if isinstance(data.get("tokens"), dict) else {}

    accessible_frames = frames.get("accessible") if isinstance(frames.get("accessible"), list) else []
    inaccessible_frames = frames.get("inaccessible") if isinstance(frames.get("inaccessible"), list) else []
    inaccessible_styles = (
        assets.get("inaccessibleStylesheets")
        if isinstance(assets.get("inaccessibleStylesheets"), list)
        else []
    )
    stylesheets = assets.get("stylesheets") if isinstance(assets.get("stylesheets"), list) else []
    collected_nodes = limits.get("collectedNodes")
    max_nodes = limits.get("maxNodes")
    viewport = page.get("viewport") if isinstance(page.get("viewport"), dict) else {}

    errors: list[str] = []
    warnings: list[str] = []
    if data.get("schema") != SUPPORTED_SCHEMA:
        errors.append(f"unsupported schema: {data.get('schema')!r}")
    if not page.get("url") or not page.get("title"):
        errors.append("page identity is incomplete")
    if not isinstance(data.get("tree"), dict):
        errors.append("DOM tree is missing")
    if not isinstance(collected_nodes, int) or collected_nodes <= 0:
        errors.append("collected node count is missing or zero")
    if isinstance(collected_nodes, int) and isinstance(max_nodes, int) and collected_nodes >= max_nodes:
        errors.append(f"node collection reached its limit: {collected_nodes}/{max_nodes}")
    if inaccessible_frames:
        errors.append(f"inaccessible iframe count: {len(inaccessible_frames)}")
    if inaccessible_styles:
        errors.append(f"inaccessible stylesheet count: {len(inaccessible_styles)}")

    missing_texts = [text for text in expected_texts if not contains_text(data.get("tree"), text)]
    if missing_texts:
        errors.append("expected state text is missing: " + ", ".join(missing_texts))
    if not stylesheets:
        warnings.append("no stylesheet assets were recorded")
    token_counts = {
        key: len(tokens.get(key, [])) if isinstance(tokens.get(key), list) else 0
        for key in ("colors", "fonts", "radii")
    }
    if not any(token_counts.values()):
        warnings.append("no aggregate style tokens were recorded")

    return {
        "result": "blocked" if errors else "usable",
        "schema": data.get("schema"),
        "captured_at": data.get("capturedAt", ""),
        "page": {
            "title": page.get("title", ""),
            "url": page.get("url", ""),
            "viewport": {
                "width": viewport.get("width"),
                "height": viewport.get("height"),
                "device_pixel_ratio": viewport.get("devicePixelRatio"),
            },
        },
        "frames": {
            "accessible": len(accessible_frames),
            "inaccessible": len(inaccessible_frames),
            "titles": [frame.get("title", "") for frame in accessible_frames if isinstance(frame, dict)],
        },
        "nodes": {"collected": collected_nodes, "limit": max_nodes},
        "stylesheets": {"recorded": len(stylesheets), "inaccessible": len(inaccessible_styles)},
        "tokens": token_counts,
        "expected_texts": expected_texts,
        "errors": errors,
        "warnings": warnings,
    }


def print_report(report: dict[str, Any]) -> None:
    page = report["page"]
    viewport = page["viewport"]
    print(f"PAGE {page['title']} | {page['url']}")
    print(
        "VIEWPORT "
        f"{viewport['width']}x{viewport['height']} "
        f"dpr={viewport['device_pixel_ratio']}"
    )
    print(
        "FRAMES "
        f"accessible={report['frames']['accessible']} "
        f"inaccessible={report['frames']['inaccessible']}"
    )
    print(f"NODES {report['nodes']['collected']}/{report['nodes']['limit']}")
    print(
        "STYLESHEETS "
        f"recorded={report['stylesheets']['recorded']} "
        f"inaccessible={report['stylesheets']['inaccessible']}"
    )
    for warning in report["warnings"]:
        print(f"WARN {warning}")
    for error in report["errors"]:
        print(f"ERROR {error}")
    print(f"RESULT {report['result']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--expect-text", action="append", default=[])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        report = inspect_snapshot(args.snapshot.expanduser().resolve(), args.expect_text)
    except ValueError as exc:
        report = {"result": "blocked", "errors": [str(exc)], "warnings": []}

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    elif "page" in report:
        print_report(report)
    else:
        for error in report["errors"]:
            print(f"ERROR {error}")
        print("RESULT blocked")
    return 0 if report["result"] == "usable" else 2


if __name__ == "__main__":
    raise SystemExit(main())
