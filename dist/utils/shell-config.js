"use strict";
/**
 * Shell Configuration & Token Persistence
 *
 * Handles token storage across three layers:
 * 1. Shell rc files (.zshrc, .bashrc) — for interactive terminal sessions
 * 2. ~/.zshenv — for non-interactive zsh subprocesses
 * 3. ~/.notion-cli/config.json — for environments with no shell at all
 *    (AI agent runtimes like OpenClaw, cron jobs, CI pipelines)
 *
 * Token resolution order (in notion.ts):
 *   process.env.NOTION_TOKEN > ~/.notion-cli/config.json
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectShell = detectShell;
exports.getRcFilePath = getRcFilePath;
exports.readTokenFromConfig = readTokenFromConfig;
exports.persistToken = persistToken;
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const os = require("os");
// Config file path: ~/.notion-cli/config.json (same dir used for caches)
const CONFIG_DIR = path.join(os.homedir(), '.notion-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
/**
 * Detect the current shell from the SHELL environment variable.
 * Falls back to bash on Unix, powershell on Windows.
 */
function detectShell() {
    const shell = process.env.SHELL || '';
    if (shell.includes('zsh'))
        return 'zsh';
    if (shell.includes('bash'))
        return 'bash';
    if (shell.includes('fish'))
        return 'fish';
    return process.platform === 'win32' ? 'powershell' : 'bash';
}
/**
 * Resolve the path to the shell's rc/config file.
 */
function getRcFilePath(shell) {
    const home = os.homedir();
    switch (shell) {
        case 'zsh':
            return path.join(home, '.zshrc');
        case 'bash':
            return path.join(home, '.bashrc');
        case 'fish':
            return path.join(home, '.config', 'fish', 'config.fish');
        case 'powershell':
            return path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
        default:
            return path.join(home, '.bashrc');
    }
}
/**
 * Read the Notion token from ~/.notion-cli/config.json.
 * Synchronous because it runs at module load time (before Notion client init).
 * Returns null if file doesn't exist, is malformed, or has no token.
 */
function readTokenFromConfig() {
    try {
        const raw = fsSync.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(raw);
        return typeof config.token === 'string' ? config.token : null;
    }
    catch {
        return null;
    }
}
/**
 * Upsert a NOTION_TOKEN export line in a single shell file.
 * Replaces existing line if found, otherwise appends a new one.
 */
async function upsertTokenInFile(filePath, token) {
    let content = '';
    try {
        content = await fs.readFile(filePath, 'utf-8');
    }
    catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
            throw error;
        }
    }
    const tokenLineRegex = /^export\s+NOTION_TOKEN=.*/gm;
    const newTokenLine = `export NOTION_TOKEN="${token}"`;
    let updated;
    if (tokenLineRegex.test(content)) {
        updated = content.replace(tokenLineRegex, newTokenLine);
    }
    else {
        updated = content.trim() + '\n\n# Notion CLI Token\n' + newTokenLine + '\n';
    }
    await fs.writeFile(filePath, updated, 'utf-8');
}
/**
 * Persist a Notion token to all storage layers:
 * 1. Shell rc file (.zshrc / .bashrc / etc.) — interactive sessions
 * 2. ~/.zshenv (zsh only) — non-interactive subprocesses
 * 3. ~/.notion-cli/config.json — shell-free environments (AI agents, cron)
 *
 * Returns the shell name and primary rc file path so callers can inform the user.
 */
async function persistToken(token) {
    const shell = detectShell();
    const rcFile = getRcFilePath(shell);
    // 1. Write to shell rc file (interactive sessions)
    await upsertTokenInFile(rcFile, token);
    // 2. For zsh: also write to ~/.zshenv (non-interactive subprocesses)
    if (shell === 'zsh') {
        await upsertTokenInFile(path.join(os.homedir(), '.zshenv'), token);
    }
    // 3. Write to ~/.notion-cli/config.json (shell-free environments)
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    let config = {};
    try {
        config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
    }
    catch { /* file doesn't exist yet — start fresh */ }
    config.token = token;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return { rcFile, shell };
}
