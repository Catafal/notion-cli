# Templates Guide

Save reusable page presets and create pages from them with a single command.

Templates store properties, body content, and an icon. They are not tied to any specific database — the same template works across different databases. When you use a template, properties are matched against the target database schema automatically.

## When to Use This

- You create the same type of page repeatedly (meetings, tasks, standups)
- You want consistent properties pre-filled every time
- You want starter body content (agendas, checklists, outlines)
- You use multiple databases with similar schemas

## Prerequisites

- Notion CLI installed and configured (`notion-cli whoami` works)
- At least one database accessible to your integration
- Optionally: a default bookmark set (`notion-cli bookmark set inbox DB_ID --default`)

---

## Save Your First Template

A template needs at least one of: properties, content, or icon.

### Properties Only

Save a template that pre-fills the "Status" and "Priority" properties:

```bash
notion-cli template save "task" --properties '{"Status": "To Do", "Priority": 3}'
```

Output:
```
Saved template "task"
  Properties: Status, Priority
```

### Properties + Content + Icon

Save a meeting template with an agenda structure:

```bash
notion-cli template save "meeting" \
  --properties '{"Status": "To Do", "Type": "Meeting"}' \
  --content "# Agenda\n\n## Discussion Points\n\n- Point 1\n- Point 2\n\n## Action Items\n\n- [ ] Item 1" \
  --icon "📋"
```

### Content Only

Save a template that only provides starter body content:

```bash
notion-cli template save "standup" \
  --content "# Standup\n\n## Done Yesterday\n\n## Doing Today\n\n## Blockers" \
  --icon "🧑‍💻"
```

---

## Manage Templates

### List all templates

```bash
notion-cli template list
```

Output:
```
┌──────────┬─────────┬─────────┬──────┐
│ name     │ # props │ content │ icon │
├──────────┼─────────┼─────────┼──────┤
│ task     │ 2       │         │      │
│ meeting  │ 2       │ yes     │ 📋   │
│ standup  │ 0       │ yes     │ 🧑‍💻   │
└──────────┴─────────┴─────────┴──────┘
```

### View a template

```bash
notion-cli template get "meeting"
```

Output:
```
Template: meeting
Icon: 📋
Properties:
{
  "Status": "To Do",
  "Type": "Meeting"
}
Content:
# Agenda

## Discussion Points

- Point 1
- Point 2

## Action Items

- [ ] Item 1
```

### Update a template

Re-run `template save` with the same name. It overwrites the previous version:

```bash
notion-cli template save "task" --properties '{"Status": "In Progress", "Priority": 5}'
```

### Remove a template

```bash
notion-cli template remove "meeting"
```

---

## Create Pages from Templates

### Using `template use`

The `template use` command creates a page in a target database using the template:

```bash
notion-cli template use "meeting" --to tasks --title "Sprint Planning"
```

Output:
```
Created from template "meeting": Sprint Planning
https://www.notion.so/Sprint-Planning-abc123
```

The `--to` flag accepts a bookmark name, a database name (after `notion-cli sync`), or a database ID. If omitted, the default bookmark is used.

### Using `quick --template`

The `quick` command supports a `--template` flag for combining quick capture with template properties:

```bash
notion-cli quick "Sprint Planning" --template meeting --to tasks
```

This creates the page with:
- Title: "Sprint Planning" (from the argument)
- Properties: Status = "To Do", Type = "Meeting" (from template)
- Body: The agenda markdown (from template content)
- Icon: 📋 (from template)

**Content priority:** If you provide body content in the argument AND the template has content, the argument wins. Template content is only used when no body is provided.

---

## How Property Matching Works

Templates store properties in [simple format](simple-properties.md) — flat JSON like `{"Status": "To Do"}`. When you use a template, the CLI:

1. Fetches the target database schema
2. Matches each template property name against the schema (case-insensitive)
3. Expands the value to the correct Notion API format based on property type
4. Ignores template properties that don't exist in the target database

This means:
- The same "task" template works with any database that has a "Status" property
- If the target database doesn't have a "Priority" property, it's silently skipped
- Property types are validated — `"Priority": 3` works for number properties, `"Tags": ["a", "b"]` works for multi-select

### Supported Property Types

Templates support all 13 property types from the simple properties format:

| Type | Example Value |
|------|---------------|
| title | `"My Page"` |
| rich_text | `"Some text"` |
| number | `5` |
| checkbox | `true` |
| select | `"Option A"` |
| multi_select | `["Tag1", "Tag2"]` |
| status | `"In Progress"` |
| date | `"2026-01-15"` or `"tomorrow"` or `"+7 days"` |
| url | `"https://example.com"` |
| email | `"user@example.com"` |
| phone_number | `"+1234567890"` |
| people | `["user-uuid"]` |
| relation | `["page-uuid"]` |

Relative dates (`"today"`, `"tomorrow"`, `"+7 days"`, `"+2 weeks"`) are resolved at page creation time, not when the template is saved.

---

## Automation Examples

### JSON output for scripts

```bash
notion-cli template use "task" --to inbox --title "Automated Task" --json
```

```json
{
  "success": true,
  "data": { "id": "...", "url": "..." },
  "template": "task",
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

### Shell alias for common templates

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias mtg="notion-cli template use meeting --to tasks --title"
alias task="notion-cli template use task --to inbox --title"
```

Then:
```bash
mtg "Sprint Planning"
task "Fix login bug"
```

### Batch page creation

```bash
# Create multiple pages from the same template
for title in "Design Review" "Sprint Retro" "Backlog Grooming"; do
  notion-cli template use "meeting" --to tasks --title "$title" --json
done
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `Provide at least one of --properties, --content, or --icon` | No fields provided | Add at least one flag to `template save` |
| `Invalid properties JSON` | Malformed JSON in `--properties` | Check JSON syntax — must be a plain object like `{"key": "value"}` |
| `Template "name" not found` | Template doesn't exist | Run `template list` to see available templates |
| `No target database specified` | No `--to` flag and no default bookmark | Add `--to DB_NAME` or set a default bookmark |
| Properties not applied | Template property name doesn't match database schema | Run `db schema DB_ID` to check property names; matching is case-insensitive |

---

## Related Documentation

- **[Templates Command Reference](../templates.md)** — Full command syntax, all flags, and output format
- **[Simple Properties](simple-properties.md)** — Flat JSON property format used by templates
- **[Quick Capture](../quick.md)** — Quick command with `--template` integration
- **[Bookmarks](../bookmark.md)** — Save shortcuts to databases (used by `--to` flag)
- **[Filter Guide](filter-guide.md)** — Database query filtering syntax
