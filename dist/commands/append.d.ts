/**
 * Append Shortcut Command
 *
 * Quick-append content to any existing Notion page by name, URL, ID, or bookmark.
 * Combines resolveNotionId (name → page ID) with appendBlockChildren (content → blocks).
 *
 * This is the "write to existing page" counterpart of `quick` (which creates new pages).
 *
 *   notion-cli append "Daily Log" "New note"
 *   notion-cli append PAGE_URL "## Heading\n\nBody"
 *   echo "piped text" | notion-cli append "Daily Log"
 */
import { Command } from '@oclif/core';
export default class Append extends Command {
    static description: string;
    static aliases: string[];
    static examples: {
        description: string;
        command: string;
    }[];
    static args: {
        target: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
        content: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'page-size': import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        retry: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        timeout: import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        'no-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        verbose: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        minimal: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    /** Read all data from stdin (for piped input). */
    private readStdin;
}
