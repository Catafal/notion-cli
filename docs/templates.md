`notion-cli template`
=====================

Reusable page presets. Save a named set of properties, body content, and icon once, then create pages from that template in any database. Templates are database-agnostic — properties expand against the target database schema at runtime.

* [`notion-cli template save NAME`](#notion-cli-template-save-name)
* [`notion-cli template list`](#notion-cli-template-list)
* [`notion-cli template get NAME`](#notion-cli-template-get-name)
* [`notion-cli template remove NAME`](#notion-cli-template-remove-name)
* [`notion-cli template use NAME`](#notion-cli-template-use-name)

---

## `notion-cli template save NAME`

Save a reusable page template.

A template stores up to three fields: properties (flat JSON), markdown body content, and an emoji icon. At least one field is required. If a template with the same name exists, it is overwritten.

Properties use the [simple properties format](user-guides/simple-properties.md) — flat JSON that gets expanded against the target database schema when the template is used.

```
USAGE
  $ notion-cli template save NAME [-p <value>] [-c <value>] [--icon <value>]
    [-j] [--page-size <value>] [--retry] [--timeout <value>] [--no-cache] [-v]
    [--minimal]

ARGUMENTS
  NAME  Template name (e.g. "meeting", "task")

FLAGS
  -c, --content=<value>     Markdown body content for the page
  -j, --json                Output as JSON (recommended for automation)
  -p, --properties=<value>  Properties as JSON (simple format)
  -v, --verbose             Enable verbose logging to stderr
      --icon=<value>        Emoji icon (e.g. "📋")
      --minimal             Strip unnecessary metadata
      --no-cache            Bypass cache and force fresh API calls
      --page-size=<value>   [default: 100] Items per page (1-100)
      --retry               Auto-retry on rate limit
      --timeout=<value>     [default: 30000] Request timeout in milliseconds

ALIASES
  $ notion-cli tpl:save

DESCRIPTION
  Templates are NOT tied to a specific database. Properties are stored as-is
  and expanded against the target database schema when the template is used.
  This means the same "meeting" template works with any database that has
  matching property names.

EXAMPLES
  Save a template with properties only

    $ notion-cli template save "task" --properties '{"Status": "To Do", "Priority": 3}'

  Save with properties, content, and icon

    $ notion-cli template save "meeting" \
      --properties '{"Status": "To Do", "Type": "Meeting"}' \
      --content "# Agenda\n\n## Discussion\n\n## Action Items" \
      --icon "📋"

  Save a content-only template (no properties)

    $ notion-cli template save "standup" \
      --content "# Standup\n\n## Done\n\n## Doing\n\n## Blockers" \
      --icon "🧑‍💻"

  Overwrite an existing template

    $ notion-cli template save "task" --properties '{"Status": "In Progress"}'
```

### Output Examples

**Human-readable:**
```
Saved template "meeting"
  Properties: Status, Type
  Content: # Agenda\n\n## Discussion\n\n## Action I...
  Icon: 📋
```

**JSON (`--json`):**
```json
{
  "success": true,
  "data": {
    "name": "meeting",
    "properties": { "Status": "To Do", "Type": "Meeting" },
    "content": "# Agenda\n\n## Discussion\n\n## Action Items",
    "icon": "📋"
  },
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

---

## `notion-cli template list`

List all saved templates.

Displays a table with the template name, number of properties, whether it has body content, and the icon. Use `--json` for a full dump of all template data.

```
USAGE
  $ notion-cli template list [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

FLAGS
  -j, --json       Output as JSON (recommended for automation)
  -v, --verbose    Enable verbose logging to stderr
      --minimal    Strip unnecessary metadata
      --no-cache   Bypass cache and force fresh API calls

ALIASES
  $ notion-cli tpl:ls

EXAMPLES
  List all templates

    $ notion-cli template list

  List as JSON (full data)

    $ notion-cli template list --json
```

### Output Examples

**Human-readable (table):**
```
┌──────────┬─────────┬─────────┬──────┐
│ name     │ # props │ content │ icon │
├──────────┼─────────┼─────────┼──────┤
│ meeting  │ 2       │ yes     │ 📋   │
│ task     │ 2       │         │      │
│ standup  │ 1       │ yes     │ 🧑‍💻   │
└──────────┴─────────┴─────────┴──────┘
```

**No templates saved:**
```
No templates saved yet.
Create one with: notion-cli template save <name> --properties '{"Status": "To Do"}'
```

**JSON (`--json`):**
```json
{
  "success": true,
  "data": {
    "templates": {
      "meeting": {
        "properties": { "Status": "To Do", "Type": "Meeting" },
        "content": "# Agenda\n\n## Discussion",
        "icon": "📋"
      },
      "task": {
        "properties": { "Status": "To Do", "Priority": 3 }
      }
    }
  },
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

---

## `notion-cli template get NAME`

View the full contents of a saved template.

Displays the template name, icon, properties (pretty-printed JSON), and markdown content. Useful for inspecting a template before using it.

```
USAGE
  $ notion-cli template get NAME [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  NAME  Template name

FLAGS
  -j, --json       Output as JSON (recommended for automation)
  -v, --verbose    Enable verbose logging to stderr
      --minimal    Strip unnecessary metadata
      --no-cache   Bypass cache and force fresh API calls

ALIASES
  $ notion-cli tpl:get

EXAMPLES
  View a template

    $ notion-cli template get "meeting"

  View as JSON

    $ notion-cli template get "meeting" --json
```

### Output Examples

**Human-readable:**
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

## Discussion

## Action Items
```

**JSON (`--json`):**
```json
{
  "success": true,
  "data": {
    "name": "meeting",
    "properties": { "Status": "To Do", "Type": "Meeting" },
    "content": "# Agenda\n\n## Discussion\n\n## Action Items",
    "icon": "📋"
  },
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

---

## `notion-cli template remove NAME`

Remove a saved template by name.

If the template does not exist, the command prints a message and exits without error.

```
USAGE
  $ notion-cli template remove NAME [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  NAME  Template name to remove

FLAGS
  -j, --json       Output as JSON (recommended for automation)
  -v, --verbose    Enable verbose logging to stderr
      --minimal    Strip unnecessary metadata
      --no-cache   Bypass cache and force fresh API calls

ALIASES
  $ notion-cli tpl:rm

EXAMPLES
  Remove a template

    $ notion-cli template remove "meeting"
```

### Output Examples

**Template existed:**
```
Removed template "meeting"
```

**Template not found:**
```
Template "meeting" not found.
Run `notion-cli template list` to see saved templates.
```

---

## `notion-cli template use NAME`

Create a page from a saved template.

Loads the template, resolves the target database, expands template properties against the database schema, converts markdown content to Notion blocks, and creates the page. The `--title` flag is required and sets the page title.

The target database can be specified with `--to` (bookmark name, database name, or ID). If omitted, the default bookmark is used.

```
USAGE
  $ notion-cli template use NAME -t <value> [--to <value>] [-j]
    [--page-size <value>] [--retry] [--timeout <value>] [--no-cache] [-v]
    [--minimal]

ARGUMENTS
  NAME  Template name to use

FLAGS
  -j, --json           Output as JSON (recommended for automation)
  -t, --title=<value>  (required) Page title
  -v, --verbose        Enable verbose logging to stderr
      --minimal        Strip unnecessary metadata
      --no-cache       Bypass cache and force fresh API calls
      --to=<value>     Target bookmark name, database name, or ID

ALIASES
  $ notion-cli tpl:use

DESCRIPTION
  The command follows this sequence:
  1. Loads the template from ~/.notion-cli/templates.json
  2. Resolves the target database (--to flag or default bookmark)
  3. Fetches the database schema to find the title property
  4. Merges the page title into template properties
  5. Expands simple properties against the database schema
  6. Converts template markdown content to Notion blocks (if present)
  7. Creates the page with properties, children blocks, and icon

  Template properties that don't match the target database schema are
  silently ignored. This lets the same template work across databases
  with different schemas.

EXAMPLES
  Create a page from a template

    $ notion-cli template use "meeting" --to tasks --title "Sprint Planning"

  Use the default bookmark as target

    $ notion-cli template use "task" --title "Fix login bug"

  Create with JSON output

    $ notion-cli template use "standup" --to daily --title "Monday Standup" --json
```

### How It Works

1. Loads template from `~/.notion-cli/templates.json`
2. Resolves target database via `--to` flag or default bookmark
3. Fetches the database schema and finds the title property name
4. Merges `--title` value into the template's simple properties
5. Expands all properties via `expandSimpleProperties()` against the schema
6. Converts template content to Notion blocks via `markdownToBlocks()`
7. Creates the page with properties, blocks, and optional emoji icon

### Output Examples

**Human-readable:**
```
Created from template "meeting": Sprint Planning
https://www.notion.so/Sprint-Planning-abc123
```

**JSON (`--json`):**
```json
{
  "success": true,
  "data": {
    "object": "page",
    "id": "abc123...",
    "url": "https://www.notion.so/Sprint-Planning-abc123",
    "properties": { "..." }
  },
  "template": "meeting",
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

---

## Integration with `quick` Command

The `quick` command supports a `--template` flag that merges template properties and content into the quick-captured page.

```bash
# Quick capture with template properties applied
notion-cli quick "Sprint Planning" --template meeting --to tasks

# Template content used as body when no body is provided
notion-cli quick --title "Monday Standup" --template standup --to daily
```

**How merging works:**
- Template properties are expanded against the target database schema
- The page title (from the content argument) overrides any title in template properties
- Body content from the argument takes precedence over template content
- Template icon is applied to the page

---

## Config File Reference

Location: `~/.notion-cli/templates.json`

```json
{
  "version": "1.0.0",
  "templates": {
    "meeting": {
      "properties": { "Status": "To Do", "Type": "Meeting" },
      "content": "# Agenda\n\n## Discussion\n\n## Action Items",
      "icon": "📋"
    },
    "task": {
      "properties": { "Status": "To Do", "Priority": 3 }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config format version (currently `"1.0.0"`) |
| `templates` | object | Map of template name (lowercase) to template data |
| `templates[name].properties` | object | Simple properties format (flat JSON) |
| `templates[name].content` | string | Markdown body content (converted to blocks at use-time) |
| `templates[name].icon` | string | Emoji icon applied to created pages |

Template names are case-insensitive. `"Meeting"` and `"meeting"` refer to the same template.

The file is created by `template save` and read by all template commands on every invocation.

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Provide at least one of --properties, --content, or --icon` | `template save` called with no fields | Add at least one flag |
| `Invalid properties JSON: ...` | `--properties` value is not valid JSON | Check JSON syntax — must be a plain object |
| `Template "name" not found` | `template get`, `remove`, or `use` with unknown name | Run `template list` to see saved templates |
| `No target database specified and no default bookmark set` | `template use` without `--to` and no default bookmark | Add `--to DB_NAME` or set a default bookmark |

---

## Related

- [`notion-cli quick`](../docs/quick.md) — Quick-capture with optional `--template` flag
- [`notion-cli bookmark`](../docs/bookmark.md) — Save database shortcuts (used by `--to` flag)
- [`notion-cli daily`](../docs/daily.md) — Daily journal entries
- [Simple Properties](user-guides/simple-properties.md) — Flat JSON property format used by templates
- [Templates Guide](user-guides/templates-guide.md) — Step-by-step walkthrough
