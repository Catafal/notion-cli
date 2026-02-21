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
/**
 * Detect the current shell from the SHELL environment variable.
 * Falls back to bash on Unix, powershell on Windows.
 */
export declare function detectShell(): string;
/**
 * Resolve the path to the shell's rc/config file.
 */
export declare function getRcFilePath(shell: string): string;
/**
 * Read the Notion token from ~/.notion-cli/config.json.
 * Synchronous because it runs at module load time (before Notion client init).
 * Returns null if file doesn't exist, is malformed, or has no token.
 */
export declare function readTokenFromConfig(): string | null;
/**
 * Persist a Notion token to all storage layers:
 * 1. Shell rc file (.zshrc / .bashrc / etc.) — interactive sessions
 * 2. ~/.zshenv (zsh only) — non-interactive subprocesses
 * 3. ~/.notion-cli/config.json — shell-free environments (AI agents, cron)
 *
 * Returns the shell name and primary rc file path so callers can inform the user.
 */
export declare function persistToken(token: string): Promise<{
    rcFile: string;
    shell: string;
}>;
