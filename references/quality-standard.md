# Design context quality standard

Read `genesis-design-reference.md`. Use the user-approved Genesis example as the sole golden reference for **content completeness, specificity, description density, and enforceable guardrails**. It is not a source of default values or a package layout to copy verbatim. Every product-specific value and rule still requires evidence, and its content must be separated across `DESIGN.md`, `tokens.json`, and `COMPONENTS.md` according to `context-schema.md`.

## Required coverage

Assess every category. Record one status in `context-manifest.json`: `confirmed`, `observed`, `candidate`, `not-applicable`, or `missing`.

| Category | A reusable output establishes | Highest-value evidence |
|---|---|---|
| `design_intent` | Product mood, hierarchy, density, distinctive visual devices, and the intended impression | Representative page snapshots |
| `semantic_color` | Exact palette, semantic roles, allowed uses, restrictions, and relevant state colors | Node computed styles across representative snapshots |
| `typography` | Families, role mapping, weights, line height, letter spacing, and a usable visible scale | Representative text nodes and loaded font assets |
| `spacing_layout` | Spacing logic, containers, grids, section spacing, density, and responsive changes | Node geometry at known snapshot viewports |
| `border_radius` | Border and radius scale mapped to component roles | Node computed styles plus visible component use |
| `elevation` | Static, focus, overlay, dropdown, and modal elevation behavior; or evidence of a flat system | Captured default and open/focus states |
| `components` | Reusable anatomy, critical dimensions, visual rules, variants, and composition | DOM tree, geometry, computed styles, and state snapshots |
| `interaction_states` | Applicable focus, active, selected, disabled, loading, empty, success, warning, and error states | Separate snapshots with each state visible |
| `motion` | Applicable durations, easing, property changes, and entrance/exit behavior when present in captured style data | Snapshot style and asset metadata plus visible start/end states |
| `imagery_iconography` | Illustration, image, texture, icon source, stroke/fill, crop, and usage rules | Snapshot asset manifest and representative nodes |
| `guardrails` | Specific Do/Don't rules that prevent plausible but off-brand output | Repeated cross-page snapshots |

`not-applicable` is a conclusion, not a shortcut. Use it only when the planned scope genuinely has no such behavior, such as a deliberately static artifact with no interactive states.

## Description conventions

Write with Genesis-level specificity while keeping evidence and rule sources separated:

- **Overview / design intent**: use 2–4 sentences to state mood, hierarchy, density, and distinctive visual devices. Avoid generic labels such as “modern” unless the next phrase explains what creates that quality.
- **Colors**: for each semantic color, state exact value, role, allowed uses, and important restrictions. Do not output an unlabeled palette.
- **Typography**: state family, source when known, role, weights, letter spacing, line height, and complete visible scale. Separate display, body/UI, and code/metadata roles.
- **Spacing and layout**: state base unit or repeated scale when evidence supports it, plus container, grid, section, component padding, and responsive changes.
- **Border, radius, and elevation**: map exact values to component roles and states. If the system is flat, say where borders or contrast replace shadows.
- **Components**: describe anatomy, critical values, default state, applicable variants, and visible state changes. Do not merely list what appears on a page.
- **Interaction and motion**: pair each captured state or transition with the property that changes. Never infer an uncaptured state from the default page.
- **Imagery and iconography**: define subject matter, rendering style, density, crop, stroke/fill, color treatment, and forbidden substitutes.
- **Do/Don't**: write enforceable decisions tied to evidence, not generic UX advice.

Keep `DESIGN.md` readable and cohesive. Put exact reusable values in `tokens.json`, compact component rules in `COMPONENTS.md`, and evidence provenance outside all three. Do not duplicate entire sections across files.

## Delivery classification

- `baseline-complete`: no applicable category is `missing`; semantic color, typography, and spacing/layout have healthy snapshot evidence; components and applicable states are at least `observed`; no unresolved conflict can materially change generation.
- `usable-with-gaps`: core visual language is reusable, but one or more applicable categories remain `candidate` or `missing`. State exactly what downstream generation may still guess.
- `reuse-incomplete`: any of semantic color, typography, spacing/layout, or components is missing, or the written outputs remain inventories rather than executable constraints.

The script provides a deterministic lower bound from the manifest. The semantic review may downgrade it when the files do not actually contain the promised specificity; it may not upgrade it beyond the evidence.
