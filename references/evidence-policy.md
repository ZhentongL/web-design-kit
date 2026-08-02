# Snapshot evidence and conflicts

## Finding classes

- `duplicate`: same rule, value, scope, and meaning; add the evidence source only.
- `addition`: a new rule with no equivalent; add it at the narrowest scope.
- `variant`: a different value explained by page, component, or state; keep both scopes.
- `promotion`: repeated snapshots establish a formerly inferred role or composition.
- `conflict`: incompatible values claim the same property and scope without a state, viewport, layer, or version explanation.

## Evidence strength

- Node-level geometry and computed style from a healthy snapshot are `confirmed` for that element and visible state.
- Visible structure and composition are `observed`.
- A semantic role, shared scale, or global rule inferred from one page remains `candidate`.
- Aggregate frequency lists are discovery aids, not Tokens.
- Hidden or uncaptured states provide no evidence.

## Resolution

1. Separate shell, iframe, page, component, state, viewport, and version scopes before declaring a conflict.
2. Replace a candidate when a healthy snapshot supplies the exact value; record the change in the changelog.
3. Never guess, average, or silently overwrite two same-scope confirmed values.
4. Request one exact recapture only when the unresolved conflict materially affects reuse.

## Update summary

```text
Added:
Changed or promoted:
Variants:
Conflicts:
Unchanged duplicates:
Needs another state snapshot:
```
