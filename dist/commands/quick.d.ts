import { Command } from '@oclif/core';
/**
 * Zero-friction page creation for quick thoughts and notes.
 *
 * Uses the default bookmark (or --to flag) to know which database to target.
 * Title is the first line; remaining lines become page body as markdown blocks.
 *
 * Supports stdin piping: echo "notes" | notion-cli quick --title "From pipe"
 */
export default class Quick extends Command {
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
        to: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        title: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    run(): Promise<void>;
    /** Read all data from stdin (for piped input). */
    private readStdin;
}
