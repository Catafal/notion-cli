`notion-cli init`
=================

First-time setup wizard. Configures your token, tests the API connection, and syncs your workspace — all in one command.

* [`notion-cli init [TOKEN]`](#notion-cli-init-token)

## `notion-cli init [TOKEN]`

Set up Notion CLI with a single command. Pass your token as an argument to skip interactive prompts.

The wizard runs 3 steps:
1. **Save token** — persists to your shell config (`~/.zshrc`, `~/.bashrc`, etc.)
2. **Test connection** — verifies the token works against the Notion API
3. **Sync workspace** — indexes all accessible databases into the local cache

```
USAGE
  $ notion-cli init [TOKEN] [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  [TOKEN]  Notion integration token (starts with secret_ or ntn_)

FLAGS
  -j, --json               Output as JSON (recommended for automation)
  -v, --verbose            Enable verbose logging to stderr
      --minimal            Strip unnecessary metadata
      --no-cache           Bypass cache and force fresh API calls
      --page-size=<value>  [default: 100] Items per page (1-100)
      --retry              Auto-retry on rate limit
      --timeout=<value>    [default: 30000] Request timeout in milliseconds

DESCRIPTION
  Interactive first-time setup wizard for Notion CLI.
  Accepts a token argument for non-interactive setup — ideal for scripts and CI.

EXAMPLES
  Set up with token directly (recommended)

    $ notion-cli init ntn_your_token_here

  Run interactive setup wizard (prompts for token)

    $ notion-cli init

  Non-interactive setup with JSON output (for CI/automation)

    $ NOTION_TOKEN=ntn_your_token notion-cli init --json
```

## Token Formats

Notion uses two token prefixes:

| Prefix    | Type           | Notes                          |
|-----------|----------------|--------------------------------|
| `ntn_`    | Current format | Created from recent integrations |
| `secret_` | Legacy format  | Older integrations still use this |

Both formats are accepted. If you paste a token without a known prefix, `secret_` is added automatically.

## What Happens After Init

- Your token is saved to the shell config file (e.g., `~/.zshrc`)
- The current terminal session uses the token immediately
- **Other open terminals** need `source ~/.zshrc` or a restart to pick up the change
- Run `notion-cli list` to verify your databases are accessible

## Related

- [`notion-cli config set-token`](config.md) — Update token without re-running the full wizard
- [`notion-cli doctor`](doctor.md) — Run health checks on your setup
- [`notion-cli sync`](sync.md) — Refresh the workspace cache
- [Authentication Setup Guide](user-guides/authentication-setup.md) — Step-by-step getting started
