import { Command } from '@oclif/core';
/**
 * Export a Notion page to a local file (markdown or JSON).
 *
 * This is the reverse of `page create -f`: instead of reading a local file
 * and pushing it to Notion, it pulls a Notion page and writes it locally.
 *
 * Markdown is the default format because it's human-readable and round-trips
 * well with `page create -f`. JSON is available via --json for automation
 * or lossless backups.
 */
export default class PageExport extends Command {
    static description: string;
    static aliases: string[];
    static examples: {
        description: string;
        command: string;
    }[];
    static args: {
        page_id: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'page-size': import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        retry: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        timeout: import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        'no-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        verbose: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        minimal: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        output: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    run(): Promise<void>;
    /**
     * Validate output path to prevent directory traversal attacks.
     * Ensures the resolved path stays within the current working directory.
     */
    private validateOutputPath;
}
