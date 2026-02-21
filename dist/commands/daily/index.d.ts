/**
 * Daily Command
 *
 * Zero-friction daily journal entries. After one-time setup:
 *   `notion-cli daily`             → create (or find) today's entry
 *   `notion-cli daily "My note"`   → create with body, or append if entry exists
 *
 * Queries the configured database by date to detect existing entries,
 * so you never get duplicate pages for the same day.
 */
import { Command } from '@oclif/core';
export default class Daily extends Command {
    static description: string;
    static aliases: string[];
    static examples: {
        description: string;
        command: string;
    }[];
    static args: {
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
}
