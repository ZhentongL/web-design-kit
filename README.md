# Web Design Kit

Web Design Kit is a Codex skill for turning browser-captured `page-snapshot.json` files into an evidence-backed design specification package for web product implementation.

It is not a Figma UI kit and not a component library. It produces reusable product design context: `DESIGN.md`, `tokens.json`, `COMPONENTS.md`, `USAGE.md`, evidence registry files, and validation metadata that an AI coding agent or frontend engineer can use when building matching screens.

## What it does

The workflow is:

```text
visible browser state -> page-snapshot.json -> inspection -> evidence registry -> Web Design Kit -> validation
```

The skill keeps extraction tied to visible UI evidence. It records design rules at the narrowest useful scope, separates confirmed facts from observed patterns, and validates whether the resulting kit is complete enough to reuse.

Supported modes:

- `init`: create a baseline kit from representative page snapshots.
- `update`: merge new pages, states, or corrections into an existing kit.
- `check`: validate structure, evidence, coverage, and reuse quality.

## Installation

Install the skill into Codex by cloning this repository into your Codex skills directory:

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/ZhentongL/web-design-kit.git ~/.codex/skills/web-design-kit
```

Restart Codex after installing so the skill list refreshes. Then invoke it as:

```text
$web-design-kit
```

## Basic Usage

Ask Codex to create or update a kit from captured page snapshots:

```text
$web-design-kit Create a Web Design Kit for this admin dashboard.
```

Codex will derive the capture checklist. For each requested page or state:

1. Open the real authenticated page in your browser.
2. Make the requested state visible.
3. Click the bundled collector bookmark.
4. Upload the downloaded `page-snapshot.json` with the requested label.

The bookmark installer lives at:

```text
~/.codex/skills/web-design-kit/dist/install_collector_bookmarklet.html
```

Open that file in a browser once and install the collector bookmark. The collector runs in your browser and captures visible DOM structure, geometry, final computed styles, same-origin iframe content, loaded assets, scroll containers, and collection diagnostics.

## Repository Structure

```text
SKILL.md                         Codex skill instructions
agents/openai.yaml               Display metadata for Codex
assets/context-template/         Template files for generated kits
dist/                            Generated bookmarklet installer
references/                      Evidence, intake, schema, and quality rules
scripts/                         Snapshot inspection, scaffolding, registry, and validation tools
```

## Evidence And Privacy

Snapshots may contain visible product text, DOM structure, asset URLs, and style information from authenticated pages. Review captured JSON files before sharing them. This repository contains the skill and tooling only; generated customer or product snapshots should stay outside the repository unless you intentionally publish them.

## Credits

The browser snapshot capture approach and collector workflow were developed by Yuqi.

## License

Web Design Kit is released under the [MIT License](LICENSE). See [NOTICE](NOTICE)
for attribution details.
