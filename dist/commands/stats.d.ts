/**
 * Stats Dashboard Command
 *
 * Shows a bird's-eye view of the Notion workspace: database count, user count,
 * property type breakdown, and per-database details. Data comes primarily from
 * the workspace cache (fast), with optional --live flag for page counts (slower).
 *
 *   notion-cli stats              # fast dashboard from cache
 *   notion-cli stats --live       # also fetch page counts per DB
 *   notion-cli stats --relations  # show database relation graph
 *   notion-cli stats --json       # JSON output for automation
 */
import { Command } from '@oclif/core';
export default class Stats extends Command {
    static description: string;
    static aliases: string[];
    static examples: {
        description: string;
        command: string;
    }[];
    static flags: {
        live: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        relations: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'page-size': import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        retry: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        timeout: import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        'no-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        verbose: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        minimal: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    /** Convert milliseconds to a human-friendly age string (e.g. "2h ago"). */
    private formatAge;
}
