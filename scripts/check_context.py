#!/usr/bin/env python3
"""Validate a Web Design Kit and its evidence-backed Token metadata."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


REQUIRED_FILES = [
    "context-manifest.json",
    "DESIGN.md",
    "tokens.json",
    "COMPONENTS.md",
    "evidence.md",
    "CHANGELOG.md",
]
RECOMMENDED_FILES = ["USAGE.md"]
REQUIRED_EXTENSIONS = {"status", "scope", "sources", "confidence", "updated_at"}
STATUSES = {"confirmed", "observed", "candidate", "conflict"}
CONFIDENCE = {"high", "medium", "low"}
CAPTURE_KINDS = {"viewport", "full-page", "crop", "unknown"}
QUALITY_PROFILE = "genesis-reference-v1"
QUALITY_CATEGORIES = {
    "design_intent",
    "semantic_color",
    "typography",
    "spacing_layout",
    "border_radius",
    "elevation",
    "components",
    "interaction_states",
    "motion",
    "imagery_iconography",
    "guardrails",
}
QUALITY_STATUSES = {"confirmed", "observed", "candidate", "not-applicable", "missing"}
CORE_QUALITY_CATEGORIES = {"semantic_color", "typography", "spacing_layout", "components"}
EXACT_CORE_CATEGORIES = {"semantic_color", "typography", "spacing_layout"}


def token_leaves(node: object, path: str = ""):
    if isinstance(node, dict):
        if "$value" in node:
            yield path or "<root>", node
            return
        for key, value in node.items():
            if key == "meta":
                continue
            child = f"{path}.{key}" if path else key
            yield from token_leaves(value, child)


def load_json(path: Path, errors: list[str]) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"invalid JSON {path.name}: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path.name} must contain a JSON object")
        return {}
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    package = args.package.expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    for filename in REQUIRED_FILES:
        if not (package / filename).is_file():
            errors.append(f"missing required file: {filename}")
    if errors:
        for error in errors:
            print(f"ERROR {error}")
        return 1

    manifest = load_json(package / "context-manifest.json", errors)
    tokens = load_json(package / "tokens.json", errors)
    if manifest.get("schema_version") != "0.1":
        errors.append(f"unsupported schema_version: {manifest.get('schema_version')!r}")

    quality_result = "reuse-incomplete"
    coverage = manifest.get("coverage")
    if manifest.get("quality_profile") != QUALITY_PROFILE:
        warnings.append(f"quality_profile is missing or unsupported: {manifest.get('quality_profile')!r}")
    if not isinstance(coverage, dict):
        warnings.append("coverage matrix is missing")
        coverage = {}
    else:
        unknown_categories = set(coverage) - QUALITY_CATEGORIES
        if unknown_categories:
            warnings.append(f"unknown coverage categories: {', '.join(sorted(unknown_categories))}")
        for category, status in coverage.items():
            if category in QUALITY_CATEGORIES and status not in QUALITY_STATUSES:
                errors.append(f"coverage {category} has invalid status: {status!r}")

    missing_categories = {
        category for category in QUALITY_CATEGORIES
        if coverage.get(category, "missing") == "missing"
    }
    candidate_categories = {
        category for category in QUALITY_CATEGORIES
        if coverage.get(category) == "candidate"
    }
    core_missing = {
        category for category in CORE_QUALITY_CATEGORIES
        if coverage.get(category, "missing") == "missing"
    }
    exact_core_unconfirmed = {
        category for category in EXACT_CORE_CATEGORIES
        if coverage.get(category) not in {"confirmed", "not-applicable"}
    }
    weak_components = coverage.get("components") not in {"confirmed", "observed", "not-applicable"}
    weak_states = coverage.get("interaction_states") not in {"confirmed", "observed", "not-applicable"}
    if core_missing:
        quality_result = "reuse-incomplete"
    elif missing_categories or candidate_categories or exact_core_unconfirmed or weak_components or weak_states:
        quality_result = "usable-with-gaps"
    else:
        quality_result = "baseline-complete"

    if missing_categories:
        warnings.append(f"missing quality categories: {', '.join(sorted(missing_categories))}")

    evidence = manifest.get("evidence", [])
    if not isinstance(evidence, list):
        errors.append("manifest evidence must be a list")
        evidence = []
    evidence_ids: set[str] = set()
    for index, item in enumerate(evidence):
        if not isinstance(item, dict):
            errors.append(f"evidence[{index}] must be an object")
            continue
        evidence_id = item.get("id")
        if not evidence_id:
            errors.append(f"evidence[{index}] has no id")
            continue
        if evidence_id in evidence_ids:
            errors.append(f"duplicate evidence id: {evidence_id}")
        evidence_ids.add(evidence_id)
        evidence_file = item.get("file", "")
        if not evidence_file or not (package / evidence_file).is_file():
            errors.append(f"evidence file is missing for {evidence_id}: {evidence_file}")
        if item.get("type") in {"screenshot", "image"}:
            capture_kind = item.get("capture_kind")
            if capture_kind is not None and capture_kind not in CAPTURE_KINDS:
                errors.append(f"evidence {evidence_id} has invalid capture_kind: {capture_kind!r}")
            image_size = item.get("image_size", "")
            if image_size and not re.fullmatch(r"[1-9]\d*x[1-9]\d*", image_size):
                errors.append(f"evidence {evidence_id} has invalid image_size: {image_size!r}")
        if item.get("type") == "page-snapshot":
            snapshot = item.get("snapshot")
            if not isinstance(snapshot, dict):
                errors.append(f"evidence {evidence_id} has no snapshot diagnostics")
                continue
            if snapshot.get("schema") != "singlefile-demo-baseline.browser-snapshot.v1":
                errors.append(f"evidence {evidence_id} has unsupported snapshot schema")
            frames = snapshot.get("frames")
            if not isinstance(frames, dict) or frames.get("inaccessible", 0):
                errors.append(f"evidence {evidence_id} has inaccessible snapshot frames")
            stylesheets = snapshot.get("stylesheets")
            if not isinstance(stylesheets, dict) or stylesheets.get("inaccessible", 0):
                errors.append(f"evidence {evidence_id} has inaccessible snapshot stylesheets")
            nodes = snapshot.get("nodes")
            if not isinstance(nodes, dict):
                errors.append(f"evidence {evidence_id} has no snapshot node diagnostics")
            elif (
                isinstance(nodes.get("collected"), int)
                and isinstance(nodes.get("limit"), int)
                and nodes["collected"] >= nodes["limit"]
            ):
                errors.append(f"evidence {evidence_id} snapshot reached its node limit")

    leaf_count = 0
    for token_path, token in token_leaves(tokens):
        leaf_count += 1
        if "$type" not in token:
            errors.append(f"token {token_path} has no $type")
        extensions = token.get("$extensions")
        if not isinstance(extensions, dict):
            errors.append(f"token {token_path} has no $extensions object")
            continue
        missing = REQUIRED_EXTENSIONS - set(extensions)
        if missing:
            errors.append(f"token {token_path} missing extensions: {', '.join(sorted(missing))}")
        if extensions.get("status") not in STATUSES:
            errors.append(f"token {token_path} has invalid status: {extensions.get('status')!r}")
        if extensions.get("confidence") not in CONFIDENCE:
            errors.append(f"token {token_path} has invalid confidence: {extensions.get('confidence')!r}")
        sources = extensions.get("sources")
        if not isinstance(sources, list) or not sources:
            errors.append(f"token {token_path} sources must be a non-empty list")
        else:
            for source in sources:
                if source not in evidence_ids:
                    errors.append(f"token {token_path} references unknown evidence: {source}")

    if leaf_count == 0:
        warnings.append("tokens.json contains no Token leaves yet")
    if not evidence:
        warnings.append("no evidence is registered yet")

    for filename in RECOMMENDED_FILES:
        path = package / filename
        if not path.is_file():
            warnings.append(f"missing downstream guidance: {filename}")
            continue
        usage = path.read_text(encoding="utf-8")
        for entry_file in ("DESIGN.md", "tokens.json", "COMPONENTS.md"):
            if entry_file not in usage:
                warnings.append(f"USAGE.md does not reference {entry_file}")

    design_text = (package / "DESIGN.md").read_text(encoding="utf-8")
    if "Document cross-page structure only after evidence establishes it." in design_text:
        warnings.append("DESIGN.md still contains scaffold guidance")

    components_text = (package / "COMPONENTS.md").read_text(encoding="utf-8")
    if "Add only demonstrated component composition" in components_text:
        warnings.append("COMPONENTS.md still contains scaffold guidance")

    for error in errors:
        print(f"ERROR {error}")
    for warning in warnings:
        print(f"WARN {warning}")
    if errors:
        return 1
    print(f"QUALITY {quality_result}")
    print(f"OK schema=0.1 evidence={len(evidence)} tokens={leaf_count} warnings={len(warnings)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
