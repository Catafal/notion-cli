<div align="center">
<pre>
███╗   ██╗ ██████╗ ████████╗██╗ ██████╗ ███╗   ██╗     ██████╗██╗     ██╗
████╗  ██║██╔═══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║    ██╔════╝██║     ██║
██╔██╗ ██║██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║    ██║     ██║     ██║
██║╚██╗██║██║   ██║   ██║   ██║██║   ██║██║╚██╗██║    ██║     ██║     ██║
██║ ╚████║╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║    ╚██████╗███████╗██║
╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝     ╚═════╝╚══════╝╚═╝
</pre>

<p align="center">
  <a href="https://github.com/Catafal/notion-cli/actions/workflows/ci.yml">
    <img src="https://github.com/Catafal/notion-cli/actions/workflows/ci.yml/badge.svg" alt="CI/CD Pipeline">
  </a>
  <a href="https://codecov.io/gh/Catafal/notion-cli">
    <img src="https://codecov.io/gh/Catafal/notion-cli/branch/main/graph/badge.svg" alt="Code Coverage">
  </a>
  <a href="https://www.npmjs.com/package/@catafal/notion-cli">
    <img src="https://img.shields.io/npm/v/@catafal/notion-cli.svg" alt="npm version">
  </a>
  <a href="https://nodejs.org">
    <img src="https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg" alt="Node.js Version">
  </a>
  <a href="https://github.com/Catafal/notion-cli/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
</p>
</div>

**IMPORTANT NOTICE:**

This is an independent, unofficial command-line tool for working with Notion's API.
This project is not affiliated with, endorsed by, or sponsored by Notion Labs, Inc.
"Notion" is a registered trademark of Notion Labs, Inc.

> Notion CLI for AI Agents & Automation

A powerful command-line interface for Notion's API, optimized for AI coding assistants and automation scripts.

**Key Features:**
- 🚀 **Fast & Direct**: Native API integration with intelligent caching
- 🤖 **AI-First Design**: JSON output, structured errors, exit codes
- ⚡ **Non-Interactive**: Perfect for scripts and automation
- 📊 **Flexible Output**: JSON, CSV, markdown tables, or raw API responses
- 🔍 **Schema Discovery**: AI-friendly database schema extraction
- 🗄️ **Workspace Caching**: Fast database lookups without API calls
- 🧠 **Smart ID Resolution**: Automatic database_id → data_source_id conversion
- 🔄 **Reliable**: Automatic retry with exponential backoff and circuit breaker
- 🔒 **Secure**: 0 production vulnerabilities

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.

---

## Quick Start

### Installation

```bash
# From npm (recommended)
npm install -g @catafal/notion-cli

# Or from source
npm install -g Catafal/notion-cli
```

**Note**: Windows users installing from source should use the local clone method due to symlink limitations:
```bash
git clone https://github.com/Catafal/notion-cli
cd notion-cli
npm install
npm run build
npm link
```

### First-Time Setup

```bash
# Run the interactive setup wizard
notion-cli init
```

This guides you through:
1. Setting your Notion API token
2. Testing the connection
3. Syncing your workspace

**Manual setup** (if you prefer):
```bash
export NOTION_TOKEN="secret_your_token_here"
notion-cli whoami       # Test connection
notion-cli sync         # Cache workspace
```

**Get your API token**: https://developers.notion.com/docs/create-a-notion-integration

### Common Commands

```bash
# List your databases
notion-cli list --json

# Discover database schema
notion-cli db schema <DATA_SOURCE_ID> --with-examples --json

# Create a page (simple properties mode)
notion-cli page create -d <DATA_SOURCE_ID> -S --properties '{
  "Name": "My Task",
  "Status": "In Progress",
  "Priority": 5,
  "Due Date": "tomorrow"
}'

# Search workspace
notion-cli search "project" --json
```

All commands support `--json` for machine-readable output.

---

## Key Features for AI Agents

### Simple Properties — 70% Less Complexity

Use flat JSON instead of complex nested Notion API structures with the `-S` flag:

```bash
# Simple properties with -S flag
notion-cli page create -d DB_ID -S --properties '{
  "Name": "Task",
  "Status": "In Progress",
  "Priority": 5,
  "Tags": ["urgent", "bug"],
  "Due Date": "tomorrow"
}'

# Update is just as easy
notion-cli page update PAGE_ID -S --properties '{
  "Status": "Done",
  "Completed": true
}'
```

Supports 13 property types, case-insensitive matching, and relative dates (`"today"`, `"+7 days"`, `"+2 weeks"`).

[📖 Simple Properties Guide](./docs/user-guides/simple-properties.md)

### Smart Database ID Resolution

No need to worry about `database_id` vs `data_source_id` — the CLI auto-converts:

```bash
# Both work! Use whichever ID you have
notion-cli db retrieve 1fb79d4c71bb8032b722c82305b63a00  # database_id
notion-cli db retrieve 2gc80e5d82cc9043c833d93416c74b11  # data_source_id
```

[📖 Smart ID Resolution](./docs/architecture/smart-id-resolution.md)

### JSON Mode — Perfect for AI Processing

Every command supports `--json` for structured, parseable output:

```bash
notion-cli db query <ID> --json | jq '.data.results[].properties'
```

Error responses are also structured JSON with exit codes (`0` = success, `1` = API error, `2` = CLI error).

### Schema Discovery

Extract complete database schemas in AI-friendly formats:

```bash
notion-cli db schema <DATA_SOURCE_ID> --with-examples --json
```

### Workspace Caching

Cache your workspace locally for instant lookups:

```bash
notion-cli sync                          # One-time sync
notion-cli db query "Tasks Database" --json  # Use names instead of IDs
notion-cli cache:info --json             # Check cache freshness
```

### Output Size Control

Reduce response size for large queries:

```bash
notion-cli db query <ID> --minimal --compact-json --page-size 10
notion-cli db query <ID> --select "Name,Status" --minimal
NO_COLOR=1 notion-cli search "My Page"   # Strip ANSI codes for clean parsing
```

[📖 AI Agent Guide](./docs/user-guides/ai-agent-guide.md) | [📖 AI Agent Cookbook](./docs/user-guides/ai-agent-cookbook.md)

---

## Core Commands

### Setup & Diagnostics

```bash
notion-cli init           # First-time setup wizard
notion-cli doctor         # Health check and diagnostics (aliases: diagnose, healthcheck)
notion-cli whoami         # Test connectivity (aliases: test, health)
```

### Database Commands

```bash
notion-cli db retrieve <ID>                          # Get database metadata
notion-cli db query <ID> --json                      # Query with results
notion-cli db query <ID> --filter '{"property": "Status", "select": {"equals": "Done"}}' --json
notion-cli db schema <ID> --with-examples --json     # Extract schema
notion-cli db update <ID> --title "New Title"        # Update database
notion-cli db create --parent-page <PAGE_ID> --title "My DB" --properties '{...}'
```

[📖 Filter Guide](./docs/user-guides/filter-guide.md)

### Page Commands

```bash
notion-cli page create -d <DB_ID> -S --properties '{...}'   # Create in database
notion-cli page create -p <PAGE_ID> -f notes.md              # Create from markdown
notion-cli page retrieve <PAGE_ID> --json                    # Get page
notion-cli page update <PAGE_ID> -S --properties '{...}'     # Update properties
notion-cli page export <PAGE_ID> -o page.md                  # Export to markdown
notion-cli page export <PAGE_ID> --json -o page.json         # Export to JSON
```

[📖 Export Guide](./docs/export.md)

### Block Commands

```bash
notion-cli block retrieve <BLOCK_ID>                  # Get block
notion-cli block append <BLOCK_ID> --children '[...]' # Append children
notion-cli block update <BLOCK_ID> --content "text"   # Update block
notion-cli block delete <BLOCK_ID>                    # Delete block
```

### Batch Operations

```bash
notion-cli batch retrieve <ID1> <ID2> <ID3> --json   # Retrieve multiple
notion-cli batch delete <ID1> <ID2> <ID3>             # Delete multiple in parallel
```

[📖 Batch Operations Guide](./docs/batch.md)

### Daily Journal

```bash
notion-cli daily                                       # Create/find today's entry
notion-cli daily "Had a productive standup"            # Create with body content
notion-cli daily "Another thought"                     # Append to existing entry
notion-cli daily setup DB_ID                           # Setup: point to existing database
notion-cli daily setup --auto PAGE_ID                  # Setup: auto-create database
```

[📖 Daily Journal Guide](./docs/user-guides/daily-journal-setup.md)

### Templates

```bash
notion-cli template save "meeting" -p '{"Status": "To Do"}' -c "# Agenda" --icon "📋"
notion-cli template list                                       # List all templates
notion-cli template get "meeting"                              # View template details
notion-cli template use "meeting" --to tasks --title "Sprint"  # Create page from template
notion-cli template remove "meeting"                           # Delete a template
notion-cli quick "My Meeting" --template meeting --to tasks    # Quick capture with template
```

[📖 Templates Guide](./docs/user-guides/templates-guide.md)

### Search

```bash
notion-cli search "project" --json                    # Search workspace
notion-cli search "docs" -p page --json               # Filter by type
notion-cli search "report" --created-after 2025-10-01 # Date filters
```

### User Commands

```bash
notion-cli user list --json           # List all users
notion-cli user retrieve <USER_ID>    # Get user
notion-cli user retrieve bot          # Get bot info
```

### Workspace & Cache

```bash
notion-cli sync                       # Cache all databases
notion-cli list --json                # List cached databases
notion-cli cache:info --json          # Cache statistics
notion-cli config set-token           # Configure token
notion-cli browse <PAGE_ID>          # Interactive page tree navigation
```

---

## Output Formats

All commands support multiple output formats:

```bash
notion-cli db query <ID> --json          # Structured JSON with envelope
notion-cli db query <ID> --compact-json  # Single-line JSON (ideal for piping)
notion-cli db query <ID> --markdown      # GitHub-flavored markdown table
notion-cli db query <ID> --pretty        # Table with borders
notion-cli db query <ID> --csv           # CSV format
notion-cli db query <ID> --raw           # Raw API response
notion-cli db query <ID> --minimal       # Strip metadata (~40% smaller)
```

[📖 Output Formats Guide](./docs/user-guides/output-formats.md) | [📖 Envelope System](./docs/user-guides/envelope-index.md)

---

## Environment Variables

### Authentication
```bash
NOTION_TOKEN=secret_your_token_here
```

### Retry & Circuit Breaker
```bash
NOTION_RETRY_MAX_ATTEMPTS=3        # Max retry attempts (default: 3)
NOTION_RETRY_INITIAL_DELAY=1000    # Initial delay in ms (default: 1000)
NOTION_RETRY_MAX_DELAY=30000       # Max delay in ms (default: 30000)
NOTION_CB_FAILURE_THRESHOLD=5      # Failures before circuit opens (default: 5)
```

### Caching & Performance
```bash
NOTION_CACHE_DISABLED=true                    # Disable all caching
NOTION_CLI_DISK_CACHE_ENABLED=true            # Persistent disk cache (default: true)
NOTION_CLI_DISK_CACHE_MAX_SIZE=104857600      # Max disk cache size (default: 100MB)
NOTION_CLI_HTTP_KEEP_ALIVE=true               # Connection pooling (default: true)
NOTION_CLI_DELETE_CONCURRENCY=5               # Parallel deletion limit (default: 5)
```

### Debugging
```bash
NOTION_CLI_VERBOSE=true            # Structured event logging to stderr
NOTION_CLI_DEBUG=true              # DEBUG + VERBOSE modes
NO_COLOR=1                         # Disable ANSI color codes in tables
```

[📖 Verbose Logging Guide](./docs/user-guides/verbose-logging.md)

---

## Real-World Examples

### Automated Task Management

```bash
#!/bin/bash
# Create task with simple properties
TASK_ID=$(notion-cli page create \
  -d <TASKS_DB_ID> -S --properties '{
    "Name": "Review PR",
    "Status": "In Progress"
  }' --json | jq -r '.data.id')

echo "Working on task: $TASK_ID"

# Mark complete
notion-cli page update $TASK_ID -S --properties '{"Status": "Done"}' --json
```

### Daily Sync Script

```bash
#!/bin/bash
notion-cli sync
notion-cli list --json > databases.json
echo "# Database Report - $(date)" > report.md
jq -r '.[] | "- **\(.title)** (\(.page_count) pages)"' databases.json >> report.md
```

---

## Troubleshooting

**Run diagnostics first:**
```bash
notion-cli doctor   # Shows 7 checks with pass/fail and recommendations
```

| Problem | Solution |
|---------|----------|
| Token not configured | `notion-cli init` or `export NOTION_TOKEN="secret_..."` |
| Database not found | `notion-cli sync` to refresh cache, or check ID type |
| 429 rate limiting | Automatic retry handles this; increase `NOTION_RETRY_MAX_ATTEMPTS` if needed |
| Slow queries | Use `--filter` to reduce data, `notion-cli sync` for caching |
| Auth errors | `notion-cli init` to reconfigure, check integration access at notion.so/my-integrations |

---

## Development

### Prerequisites

- Node.js >= 22.0.0
- npm >= 8.0.0

### Setup

```bash
git clone https://github.com/Catafal/notion-cli
cd notion-cli
npm install
npm run build
```

### Workflow

```bash
npm run build          # Build TypeScript
npm test               # Run tests (mocha + chai)
npm run lint           # Lint (ESLint v9)
npm run build && npm test && npm run lint   # Full quality check
```

### Project Structure

```
notion-cli/
├── src/               # TypeScript source
│   ├── commands/      # CLI commands
│   ├── utils/         # Utilities
│   ├── notion.ts      # Notion API client
│   └── cache.ts       # Caching layer
├── test/              # Tests
├── docs/              # Documentation
└── dist/              # Compiled output
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Documentation

Full documentation lives in the `/docs` folder:

- **[AI Agent Guide](./docs/user-guides/ai-agent-guide.md)** — Quick reference for AI assistants
- **[AI Agent Cookbook](./docs/user-guides/ai-agent-cookbook.md)** — Common patterns and recipes
- **[Simple Properties](./docs/user-guides/simple-properties.md)** — Flat JSON property format
- **[Filter Guide](./docs/user-guides/filter-guide.md)** — Database query filtering syntax
- **[Output Formats](./docs/user-guides/output-formats.md)** — JSON, CSV, markdown output options
- **[Verbose Logging](./docs/user-guides/verbose-logging.md)** — Debug mode and troubleshooting
- **[Batch Operations](./docs/batch.md)** — Retrieve or delete multiple resources
- **[Page Export](./docs/export.md)** — Export pages to markdown or JSON
- **[Interactive Browsing](./docs/user-guides/interactive-browsing.md)** — Navigate page trees
- **[Templates](./docs/user-guides/templates-guide.md)** — Reusable page presets
- **[Error Handling](./docs/user-guides/error-handling-examples.md)** — Understanding errors
- **[Envelope System](./docs/user-guides/envelope-index.md)** — Standardized response format
- **[Smart ID Resolution](./docs/architecture/smart-id-resolution.md)** — Auto ID conversion

See [docs/README.md](./docs/README.md) for the complete index.

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, test requirements, PR process, and commit format.

## API Version

This CLI uses **Notion API v5.2.1** with full support for:
- Data sources (new database API)
- Enhanced properties
- Improved pagination
- Better error handling

## Support

- **Documentation**: Full guides in `/docs` folder
- **Issues**: Report bugs on [GitHub Issues](https://github.com/Catafal/notion-cli/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/Catafal/notion-cli/discussions)

## Related Projects

- **Notion API**: https://developers.notion.com
- **@notionhq/client**: Official Notion SDK

## Legal & Compliance

### Trademark Notice
"Notion" is a registered trademark of Notion Labs, Inc. This project is an independent,
unofficial tool and is not affiliated with, endorsed by, or sponsored by Notion Labs, Inc.

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses
This project uses various open-source dependencies. See [NOTICE](NOTICE) for complete
third-party license information.

---

**Built for AI agents, optimized for automation.**
