# Maintainers

This file is for people maintaining or debugging the skill itself. Most users only need the installation and usage flow in `README.md`.

## Script Commands

Inspect a snapshot:

```bash
python3 scripts/inspect_page_snapshot.py "/absolute/path/page-snapshot.json"
```

Inspect a snapshot and require visible state text:

```bash
python3 scripts/inspect_page_snapshot.py "/absolute/path/page-snapshot.json" --expect-text "高级筛选"
```

Scaffold a new kit:

```bash
python3 scripts/scaffold_context.py "/absolute/path/my-web-design-kit" --name "Admin Console" --description "Reusable design context for the admin console"
```

Register evidence:

```bash
python3 scripts/register_evidence.py "/absolute/path/my-web-design-kit" "/absolute/path/page-snapshot.json" --state "dashboard-default"
```

Validate a kit:

```bash
python3 scripts/check_context.py "/absolute/path/my-web-design-kit"
```

Regenerate the bookmarklet installer after editing the collector:

```bash
node scripts/generate_bookmarklet.js
```

