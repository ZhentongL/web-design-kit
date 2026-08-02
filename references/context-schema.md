# Web Design Kit Schema 0.1

Contents: [Package files](#package-files) · [Snapshot evidence](#snapshot-evidence) · [Token leaf](#token-leaf) · [Status](#status) · [Scope](#scope) · [Component rules](#component-rules) · [DESIGN.md](#designmd) · [USAGE.md](#usagemd)

## Package files

```text
web-design-kit/<kit-id>/
├── context-manifest.json
├── DESIGN.md
├── tokens.json
├── COMPONENTS.md
├── USAGE.md
├── evidence.md
├── CHANGELOG.md
└── sources/
```

`DESIGN.md`, `tokens.json`, and `COMPONENTS.md` are the downstream rule sources. `USAGE.md` tells a downstream AI how to apply them without becoming another rule source. The other files maintain provenance and change safety.

## Manifest

`context-manifest.json` contains:

- `schema_version`: currently `0.1`.
- `context_id`, `name`, `description`.
- `created_at`, `updated_at`: `YYYY-MM-DD`.
- `evidence`: registered raw sources.
- `quality_profile`: currently `genesis-reference-v1`.
- `coverage`: one status for every category defined in `quality-standard.md`.

Each new evidence item contains `id`, `type: "page-snapshot"`, `file`, `sha256`, `page`, `state`, `viewport`, `captured_at`, and a compact `snapshot` diagnostics object. Existing packages may retain legacy evidence types; do not use them for new collection.

Coverage statuses are `confirmed`, `observed`, `candidate`, `not-applicable`, or `missing`. Coverage measures whether a design category is sufficiently documented; it does not replace Token-level status or evidence references.

## Snapshot evidence

Store the original JSON in `sources/`. Preserve its page URL, viewport, iframe counts, node limits, stylesheet counts, and collection diagnostics in the manifest. The registered state is a human-readable label such as `advanced-filter-open`; it does not replace the raw snapshot.

## Token leaf

Use DTCG-style leaves with required extensions:

```json
{
  "$type": "color",
  "$value": "#1C6EFF",
  "$extensions": {
    "status": "confirmed",
    "scope": "business",
    "sources": ["ev-20260715-002"],
    "confidence": "high",
    "updated_at": "2026-07-15",
    "note": "Business override loaded after library defaults."
  }
}
```

Required extension fields are `status`, `scope`, `sources`, `confidence`, and `updated_at`; `note` is optional.

## Status

- `confirmed`: exact node geometry or computed style captured from a healthy snapshot for the stated element, state, and scope.
- `observed`: visible structure, composition, or state supported by UI evidence but not exact code.
- `candidate`: a useful semantic or cross-page inference that needs repeated snapshots before reuse as a standard.
- `conflict`: unresolved disagreement between evidence that claims the same property and scope.

## Scope

Use the narrowest useful value:

- `shell`
- `business`
- `page:<slug>`
- `component:<slug>`
- `state:<slug>`

Do not merge differently scoped values merely because their property names match.

## Component rules

Choose the format from the evidence shape:

- Use grouped sections and one-line bullets when platform layers are distinct and rules in each section share roughly the same evidence strength and scope.
- Use a compact table when rules mix `confirmed`, `observed`, or `candidate` status, or need per-rule scope and evidence traceability.

Treat either format as a fast human/AI reference, not an implementation manual:

- Put one reusable visual or state pattern in each bullet or row. Split unrelated rules instead of explaining a whole page at once.
- Keep each rule to one compact sentence with direct critical values and visible state differences. In table format, the other columns carry certainty and provenance; in grouped format, state the shared evidence boundary once before the sections.
- Do not put Token paths, confidence explanations, evidence caveats, or implementation advice in `Rule`. `tokens.json`, `evidence.md`, and `DESIGN.md` carry those details.
- Add an anatomy note only when a compound component's essential order or behavior cannot fit the selected format; keep it to one short, non-redundant paragraph.

Use `genesis-design-reference.md` as the approved benchmark for rule specificity and description density. Adapt its content across the package schema: exact reusable values belong in `tokens.json`, compact component rules in `COMPONENTS.md`, and cross-page language and guardrails in `DESIGN.md`.

## DESIGN.md

Keep it thin:

1. Core layout model.
2. Visual language.
3. Typography and density.
4. Page and component selection rules.
5. Guardrails and scope boundaries.

Do not turn `DESIGN.md` into a raw inventory or evidence log.

## USAGE.md

Keep it procedural and product-neutral:

1. Read and preflight the three rule sources.
2. Map the new module or reference structure to existing Tokens and component patterns before implementation.
3. Apply the narrowest valid scope and stop on unresolved conflicts.
4. Run structure QA and design-specification QA separately.
5. Propose reusable additions for review before calling `update`.

Do not copy Token values, component rules, or evidence logs into `USAGE.md`.
