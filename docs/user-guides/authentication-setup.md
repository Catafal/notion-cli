# Authentication Setup

How to get a Notion integration token and configure the CLI so it works in every terminal session.

## Prerequisites

- Node.js 22 or later
- A Notion account with workspace access
- `notion-cli` installed (`npm install -g @coastal-programs/notion-cli`)

## Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"New integration"**
3. Give it a name (e.g., "My CLI")
4. Select the workspace you want to access
5. Click **"Submit"**
6. Copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`)

## Step 2: Share Pages with Your Integration

Notion integrations can only access pages explicitly shared with them.

1. Open a Notion page or database you want to access
2. Click the **"..."** menu (top right)
3. Click **"Connect to"** and select your integration
4. Repeat for each page or database you need

## Step 3: Configure the CLI

Run the init command with your token:

```bash
notion-cli init ntn_your_token_here
```

This does three things:
- Saves the token to your shell config (`~/.zshrc` or `~/.bashrc`)
- Tests the connection to the Notion API
- Syncs all accessible databases to the local cache

You should see output like:

```
Step 1/3: Set your Notion token
Token saved to /Users/you/.zshrc

Step 2/3: Test connection
Bot Name: My CLI
Workspace: My Workspace

Step 3/3: Sync workspace
Synced 12 databases in 1.42s

Setup Complete!
```

## Step 4: Verify

Open a **new terminal** (or run `source ~/.zshrc`) and test:

```bash
notion-cli whoami     # Shows bot name and workspace
notion-cli list       # Lists all cached databases
```

## Updating Your Token

If you need to change the token later, use either:

```bash
# Full wizard (re-tests connection and re-syncs)
notion-cli init ntn_new_token_here

# Quick update (just saves the token)
notion-cli config set-token ntn_new_token_here
```

## Troubleshooting

### "NOTION_TOKEN is not set"

Your current terminal doesn't have the token loaded. Either:
- Open a new terminal, or
- Run `source ~/.zshrc` (or `~/.bashrc`)

### "Authentication failed - token is invalid"

- Verify the token at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
- Make sure you copied the full token (they are 50+ characters)
- Try generating a new token and running `notion-cli init` again

### "No databases found"

Your integration doesn't have access to any pages. Go to Step 2 and share at least one database with your integration.

### Run diagnostics

```bash
notion-cli doctor
```

This checks Node.js version, token format, network connectivity, API access, and cache status.

## Related

- [`notion-cli init`](../init.md) — Command reference
- [`notion-cli config set-token`](../config.md) — Command reference
- [`notion-cli doctor`](../doctor.md) — Health checks
- [AI Agent Guide](ai-agent-guide.md) — Using the CLI from AI assistants
