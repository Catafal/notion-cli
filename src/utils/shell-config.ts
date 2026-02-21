/**
 * Shell Configuration Utility
 *
 * Detects the user's shell and persists environment variables (e.g., NOTION_TOKEN)
 * to the appropriate rc file (.zshrc, .bashrc, etc.).
 *
 * Used by both `config set-token` and `init` commands to avoid duplicating
 * shell detection and rc file writing logic.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

/**
 * Detect the current shell from the SHELL environment variable.
 * Falls back to bash on Unix, powershell on Windows.
 */
export function detectShell(): string {
  const shell = process.env.SHELL || ''

  if (shell.includes('zsh')) return 'zsh'
  if (shell.includes('bash')) return 'bash'
  if (shell.includes('fish')) return 'fish'

  return process.platform === 'win32' ? 'powershell' : 'bash'
}

/**
 * Resolve the path to the shell's rc/config file.
 */
export function getRcFilePath(shell: string): string {
  const home = os.homedir()

  switch (shell) {
    case 'zsh':
      return path.join(home, '.zshrc')
    case 'bash':
      return path.join(home, '.bashrc')
    case 'fish':
      return path.join(home, '.config', 'fish', 'config.fish')
    case 'powershell':
      return path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')
    default:
      return path.join(home, '.bashrc')
  }
}

/**
 * Upsert a NOTION_TOKEN export line in a single file.
 * Replaces existing line if found, otherwise appends a new one.
 */
async function upsertTokenInFile(filePath: string, token: string): Promise<void> {
  let content = ''
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
      throw error
    }
    // File doesn't exist — will be created on write
  }

  const tokenLineRegex = /^export\s+NOTION_TOKEN=.*/gm
  const newTokenLine = `export NOTION_TOKEN="${token}"`

  let updated: string
  if (tokenLineRegex.test(content)) {
    updated = content.replace(tokenLineRegex, newTokenLine)
  } else {
    updated = content.trim() + '\n\n# Notion CLI Token\n' + newTokenLine + '\n'
  }

  await fs.writeFile(filePath, updated, 'utf-8')
}

/**
 * Persist a Notion token to the user's shell config files.
 *
 * For zsh: writes to both .zshrc (interactive shells) and .zshenv
 * (non-interactive subprocesses like AI agents, e.g. OpenClaw exec).
 * For other shells: writes to the single rc/config file.
 *
 * Returns the shell name and primary rc file path so callers can inform the user.
 */
export async function persistToken(token: string): Promise<{ rcFile: string; shell: string }> {
  const shell = detectShell()
  const rcFile = getRcFilePath(shell)

  await upsertTokenInFile(rcFile, token)

  // zsh: also write to ~/.zshenv so non-interactive subprocesses inherit the token
  // (.zshrc is only sourced for interactive shells)
  if (shell === 'zsh') {
    const zshenvPath = path.join(os.homedir(), '.zshenv')
    await upsertTokenInFile(zshenvPath, token)
  }

  return { rcFile, shell }
}
