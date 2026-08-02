# Apply {{NAME}} Design Specification

`USAGE.md` defines the application sequence. The rules themselves live in `DESIGN.md`, `tokens.json`, and `COMPONENTS.md`.

## 1. Preflight

Read all three rule sources before implementation. Summarize 5–8 non-negotiable principles, the supported scope, candidate values, and unresolved conflicts. Do not code while a material conflict is unresolved.

## 2. Map before implementation

Map the requested module or reference structure to existing page patterns, components, and Tokens. Preserve the supplied skeleton and information architecture unless the requirement explicitly changes them. Confirm approximations before implementation.

## 3. Apply the specification

Select rules by scope first: `state/component/page → business → shell/global`. Within the same scope, prefer explicit component rules and guardrails over general visual-language descriptions. Use shared Tokens or theme variables instead of repeating literal values.

## 4. Run two-pass QA

- **Structure QA**: verify modules, hierarchy, order, content, CTA priority, alignment, overflow, and unintended additions.
- **Specification QA**: verify Token usage, typography, spacing, radius, borders, component states, imagery, responsive behavior, and hardcoded deviations.

List issues before correcting them.

## 5. Propose updates

After review, propose only reusable platform rules that are missing or corrected. Do not write temporary fixes or unreviewed demo choices into the kit. Apply approved changes through `web-design-kit update`.
