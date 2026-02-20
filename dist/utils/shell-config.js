"use strict";
/**
 * Shell Configuration Utility
 *
 * Detects the user's shell and persists environment variables (e.g., NOTION_TOKEN)
 * to the appropriate rc file (.zshrc, .bashrc, etc.).
 *
 * Used by both `config set-token` and `init` commands to avoid duplicating
 * shell detection and rc file writing logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectShell = detectShell;
exports.getRcFilePath = getRcFilePath;
exports.persistToken = persistToken;
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
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
 * Persist a Notion token to the user's shell rc file.
 *
 * Reads the rc file, checks if NOTION_TOKEN already exists (replaces it if so),
 * otherwise appends a new export line. Creates the file if it doesn't exist.
 *
 * Returns the shell name and rc file path so callers can inform the user.
 */
async function persistToken(token) {
    const shell = detectShell();
    const rcFile = getRcFilePath(shell);
    // Read existing rc file (create if missing)
    let rcContent = '';
    try {
        rcContent = await fs.readFile(rcFile, 'utf-8');
    }
    catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
            throw error;
        }
        // File doesn't exist — will be created on write
    }
    // Upsert the NOTION_TOKEN export line
    const tokenLineRegex = /^export\s+NOTION_TOKEN=.*/gm;
    const newTokenLine = `export NOTION_TOKEN="${token}"`;
    let updatedContent;
    if (tokenLineRegex.test(rcContent)) {
        updatedContent = rcContent.replace(tokenLineRegex, newTokenLine);
    }
    else {
        updatedContent = rcContent.trim() + '\n\n# Notion CLI Token\n' + newTokenLine + '\n';
    }
    await fs.writeFile(rcFile, updatedContent, 'utf-8');
    return { rcFile, shell };
}
