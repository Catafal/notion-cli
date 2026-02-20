`notion-cli config`
===================

Manage CLI configuration. Currently supports token storage.

* [`notion-cli config set-token [TOKEN]`](#notion-cli-config-set-token-token)

## `notion-cli config set-token [TOKEN]`

Save your Notion integration token to your shell configuration file. Detects your shell automatically and writes to the correct rc file.

Use this command to **update** an existing token. For first-time setup, prefer [`notion-cli init`](init.md) which also tests the connection and syncs your workspace.

```
USAGE
  $ notion-cli config set-token [TOKEN] [-j] [--page-size <value>] [--retry]
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
  Set NOTION_TOKEN in your shell configuration file.
  Accepts both secret_ (legacy) and ntn_ (current) token formats.

ALIASES
  $ notion-cli config token

EXAMPLES
  Set token directly

    $ notion-cli config set-token ntn_abc123...

  Set token interactively (prompts for input)

    $ notion-cli config set-token

  Set token with JSON output (for automation)

    $ notion-cli config set-token ntn_abc123... --json
```

## Supported Shells

| Shell      | Config File                                              |
|------------|----------------------------------------------------------|
| zsh        | `~/.zshrc`                                               |
| bash       | `~/.bashrc`                                              |
| fish       | `~/.config/fish/config.fish`                             |
| PowerShell | `~/Documents/PowerShell/Microsoft.PowerShell_profile.ps1`|

The command detects your shell from the `$SHELL` environment variable. If detection fails, it defaults to bash (Unix) or PowerShell (Windows).

## How Token Storage Works

1. Reads your shell config file
2. If `export NOTION_TOKEN=...` exists, replaces the value
3. If not, appends a new `export NOTION_TOKEN="..."` line
4. The token is available in all **new** terminal sessions

After running this command, either restart your terminal or run:

```bash
source ~/.zshrc  # or ~/.bashrc, depending on your shell
```

## Related

- [`notion-cli init`](init.md) — Full setup wizard (token + connection test + sync)
- [`notion-cli doctor`](doctor.md) — Verify your token is valid
- [Authentication Setup Guide](user-guides/authentication-setup.md) — Getting started from scratch
