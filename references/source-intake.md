# Snapshot intake

Contents: [Ownership boundary](#ownership-boundary) · [Capture](#capture) · [Automatic inspection](#automatic-inspection) · [Capture-plan standard](#capture-plan-standard) · [Readiness](#readiness)

Use one user-operated acquisition path for new evidence:

`agent derives the capture plan → user opens a logged-in page or state → user clicks the collection bookmark → user uploads page-snapshot.json → agent inspects → agent extracts`

## Ownership boundary

The user performs every browser-side capture action. The agent must:

1. infer the intended platform or subsystem reuse scope;
2. derive the minimum named page and state checklist using the coverage standard below;
3. tell the user how to install and use the bundled bookmark;
4. wait for the uploaded `page-snapshot.json` files;
5. inspect, register, and extract only after upload.

Never use Chrome control, browser control, Computer Use, Playwright, or another automation tool to open the product, navigate, authenticate, change UI state, click the collector, or download a snapshot. Do not inspect the live product as a substitute for uploaded snapshot evidence.

## Capture

Use the installed collector at:

`~/.codex/skills/web-design-kit/dist/install_collector_bookmarklet.html`

The installer and collector are part of this skill. Instruct the user to install the bookmark once. For each requested page or state, tell the user to:

1. open the real page in their authenticated browser;
2. make the named target state visible;
3. click **采集当前页面**;
4. upload the downloaded JSON with the requested page/state label.

Do not ask the user to identify iframes or export CSS. The snapshot diagnostics determine whether iframe content and styles were captured.

## Automatic inspection

Run:

```bash
python3 scripts/inspect_page_snapshot.py "/absolute/path/page-snapshot.json"
```

When a specific state must be present:

```bash
python3 scripts/inspect_page_snapshot.py "/absolute/path/page-snapshot.json" --expect-text "高级筛选"
```

A snapshot is `usable` only when:

- the schema and page identity are valid;
- the DOM tree contains collected nodes below `maxNodes`;
- the requested state text exists when supplied;
- no required iframe is reported inaccessible;
- no stylesheet is reported inaccessible.

If any check fails, stop and ask the user to recapture the exact page or state. Do not switch to screenshots, CSS export, public requests, web search, or another acquisition path.

## Capture-plan standard

Derive the checklist from the intended downstream reuse scope. Start with page families, then add only the states and viewports that can materially change reusable rules.

### Page-family selection

Request one default snapshot for every applicable family in the intended scope:

| Intended reusable output | Required representative snapshot |
|---|---|
| Shared platform shell | One ordinary authenticated page showing the full header, navigation, workspace frame, and persistent utilities |
| List or table patterns | One representative populated list/table page with filters, toolbar, columns, pagination, and row actions visible when applicable |
| Form patterns | One representative create/edit form showing the dominant field, grouping, label, help, and action layout |
| Detail patterns | One representative detail page showing metadata, sections, related content, and local actions |
| Dashboard patterns | One representative dashboard showing cards, charts, filters, and grid composition |
| Search or discovery patterns | One representative search/results page showing the query control, result structure, filters, and zero-result behavior when applicable |
| Overlay patterns | The owning page in each materially distinct dialog, drawer, dropdown, cascader, popover, or tooltip family |
| Independently styled iframe or embedded product | One representative default page for each independently styled layer |

Do not request a family that does not exist or is outside the stated reuse scope. When several pages share the same anatomy, choose the page with the richest normal composition rather than collecting all siblings.

### State selection

For each selected page or component family, request a separate snapshot only when the state is applicable and visibly changes reusable structure or styling:

| Rule category needed downstream | Required visible state evidence |
|---|---|
| Default visual language and components | Populated/default state |
| Navigation and choice behavior | Selected or active state |
| Keyboard/input treatment | Focus state on one representative control family |
| Availability rules | Disabled state |
| Overlay anatomy and elevation | Open state for each materially distinct overlay family |
| Empty composition | Empty or zero-result state |
| Waiting behavior | Loading state or skeleton |
| Positive feedback | Success state |
| Caution treatment | Warning state |
| Validation and failure treatment | Field-validation error and page/system error when both exist |
| Motion | Separate visible start and end states only when captured data can establish the changed properties |

One snapshot may satisfy several categories when all named states are simultaneously visible and unambiguous. Hidden, hover-only, or inferred states do not count.

### Viewport selection

- If the intended output is desktop-only, capture the supported desktop viewport used by the product.
- If responsive reuse is required, capture the same representative shell and one layout-rich page at each materially distinct supported breakpoint: mobile, tablet, and desktop when all three exist.
- Add another viewport only when navigation, grid, component anatomy, or density changes; width changes alone do not justify another snapshot.

### Checklist format

Give the user a numbered checklist before capture. Every item must contain:

`page family → exact page or best-known route → visible state → viewport → evidence purpose → requested filename label`

If the exact route is unknown, name the page by product-visible title and ask the user to choose the existing page that best matches that family. Never ask only for “more pages.”

Classify each item:

- `required`: without it, semantic color, typography, spacing/layout, components, or an explicitly requested state would remain missing;
- `conditional`: needed only when that family, state, or responsive behavior exists in the intended scope;
- `later`: useful for promotion or conflict resolution but not needed to begin a usable baseline.

Start with all `required` items and applicable `conditional` items. Do not request `later` items until inspection reveals a material gap or conflict.

## Readiness

- `ready`: every snapshot is usable and the set covers the planned baseline categories.
- `conditional`: snapshots are usable but one or more applicable categories or states remain uncaptured.
- `blocked`: a snapshot is invalid, truncated, missing the target state, or has inaccessible required frames/styles.

Readiness answers whether extraction can proceed; final package quality is classified separately.
