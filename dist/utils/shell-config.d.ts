/**
 * Shell Configuration Utility
 *
 * Detects the user's shell and persists environment variables (e.g., NOTION_TOKEN)
 * to the appropriate rc file (.zshrc, .bashrc, etc.).
 *
 * Used by both `config set-token` and `init` commands to avoid duplicating
 * shell detection and rc file writing logic.
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
 * Persist a Notion token to the user's shell rc file.
 *
 * Reads the rc file, checks if NOTION_TOKEN already exists (replaces it if so),
 * otherwise appends a new export line. Creates the file if it doesn't exist.
 *
 * Returns the shell name and rc file path so callers can inform the user.
 */
export declare function persistToken(token: string): Promise<{
    rcFile: string;
    shell: string;
}>;
