---
name: web-design-kit
description: >-
  Build, incrementally update, and validate reusable Web Design Kits
  from browser-captured page-snapshot.json files. Use when a user asks to extract
  a website or internal platform design specification, add newly captured pages
  or interaction states, reconcile design-token or component conflicts, audit a
  DESIGN.md/tokens.json/COMPONENTS.md kit, or says Web Design Kit,
  update design kit, 更新设计套件, 补充设计规范, 增量提取样式, or /update-web-design-kit.
---

# Web Design Kit

Build and maintain an evidence-backed Web Design Kit from structured browser snapshots. A Web Design Kit is the reusable specification package consumed by AI and frontend implementation; it is not a Figma UI kit or a code-component library. Keep page generation outside this skill.

## Modes

- `init`: create a platform or subsystem baseline from representative `page-snapshot.json` files.
- `update`: merge newly captured pages or states into an existing kit.
- `check`: validate kit structure, evidence, coverage, and reuse quality.

Infer the mode. Ask for the kit path only when it cannot be discovered safely.

## Required references

- Read [references/source-intake.md](references/source-intake.md) before `init` or whenever new snapshots are supplied.
- Read [references/context-schema.md](references/context-schema.md) before `init`, migration, or Token-metadata edits.
- Read [references/evidence-policy.md](references/evidence-policy.md) before every `update` or conflict decision.
- Read [references/quality-standard.md](references/quality-standard.md) before `init`, `check`, or output repair.
- Read [references/genesis-design-reference.md](references/genesis-design-reference.md) before writing or repairing `DESIGN.md`, `tokens.json`, or `COMPONENTS.md`. Use it only as the approved benchmark for coverage, specificity, description density, and enforceable guardrails; never copy its product-specific values.

## Snapshot evidence

The supported new evidence format is `singlefile-demo-baseline.browser-snapshot.v1`. It records visible DOM structure, geometry, final computed styles, same-origin iframe content, loaded assets, scroll containers, and collection diagnostics.

- The collector and one-time bookmark installer are bundled with this skill; do not depend on another skill.
- Snapshot capture is a user-operated handoff. The agent determines the exact pages and visible states required, gives the bookmark installation and capture instructions, and waits for the user to upload the JSON files.
- Never use Chrome control, browser control, Computer Use, Playwright, or another automation tool to open pages, change states, click the collector, download files, or otherwise perform capture for the user.
- Do not ask the user to choose arbitrary pages. Derive a named capture plan from the intended reuse scope and the coverage standard in `references/source-intake.md`.
- Treat a healthy node-level computed value as `confirmed` for that exact element and state.
- Treat repeated composition and layout patterns as `observed`.
- Treat inferred semantics or global roles as `candidate` until repeated snapshots establish the scope.
- Never promote a frequent color, font, or radius to a global Token without linking it to a visible role.

## Init

1. Define the platform or subsystem reuse scope. Use `references/source-intake.md` to derive the minimum named page-family and state coverage plan, then give that exact capture checklist to the user. Do not require every page.
2. Run `scripts/inspect_page_snapshot.py` on every snapshot. Stop on `blocked`; continue only with `usable`.
3. Scaffold with `scripts/scaffold_context.py <destination> --name "<name>" --description "<description>"`.
4. Register every snapshot with `scripts/register_evidence.py <kit> <snapshot> --state "<state>"`.
5. Extract rules at the narrowest scope: `shell`, `business`, `page:<slug>`, `component:<slug>`, or `state:<slug>`.
6. Write exact reusable values to `tokens.json`, concise component rules to `COMPONENTS.md`, cross-page language and guardrails to `DESIGN.md`, and application procedure to `USAGE.md`.
7. Record every quality category in `context-manifest.json`, add the `CHANGELOG.md` entry, then run `scripts/check_context.py`.

## Update

1. Accept only snapshots of existing platform rules, corrections, or explicitly approved reusable standards. Do not merge temporary demos or unreviewed proposals.
2. Run `scripts/check_context.py <kit>` and read the manifest, rule files, registry, and latest changelog entry.
3. Inspect and register each new snapshot.
4. Classify findings as `duplicate`, `addition`, `variant`, `promotion`, or `conflict`.
5. Apply safe additions and variants at the narrowest scope. Never overwrite a conflicting confirmed rule; preserve both scopes and request another state snapshot only when the conflict remains material.
6. Update only affected files and coverage categories, add the changelog entry, and rerun `check_context.py`.

## Check

1. Run `scripts/check_context.py <kit>`.
2. Review every category in `quality-standard.md`, scope errors, duplicate meanings, conflicts, and whether component rules are executable rather than inventories.
3. Report exactly one result: `baseline-complete`, `usable-with-gaps`, or `reuse-incomplete`. Do not rewrite files unless the user asked for repair.

## Discipline

- Preserve raw snapshots and unrelated user files.
- Keep independently styled shell and iframe layers in separate scopes.
- Capture only product rules demonstrated by the visible UI; do not copy an entire library theme.
- Update `DESIGN.md` only for cross-page rules or guardrails.
- Keep speculative UX recommendations outside the extracted specification.

## Handoff

Return the Web Design Kit path, mode, snapshot readiness, delivery result, evidence registered, files changed, validation result, conflicts, covered and uncovered scope, usage limits, and the highest-value next state to capture.

## Scripts

- `scripts/browser_snapshot_collector.js`: collect the current authenticated page or visible state entirely in the browser.
- `scripts/generate_bookmarklet.js`: build the draggable bookmark installer in `dist/`.
- `scripts/inspect_page_snapshot.py`: validate snapshot identity, iframe access, completeness, styles, and expected state text.
- `scripts/scaffold_context.py`: create a Web Design Kit.
- `scripts/register_evidence.py`: copy and register a snapshot with SHA-256 deduplication.
- `scripts/check_context.py`: validate Web Design Kit structure, Token metadata, evidence, and quality coverage.
