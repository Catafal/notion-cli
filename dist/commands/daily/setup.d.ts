/**
 * Daily Setup Command
 *
 * One-time configuration for the `daily` command.
 * Two modes:
 *   Manual — point to an existing database that has a Date property.
 *   Auto   — create a new "Daily Journal" database under a parent page.
 *
 * After setup, `notion-cli daily` works with zero arguments.
 */
import { Command } from '@oclif/core';
export default class DailySetup extends Command {
    static description: string;
    static examples: {
        description: string;
        command: string;
    }[];
    static args: {
        target: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'page-size': import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        retry: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        timeout: import("@oclif/core/lib/interfaces").OptionFlag<number, import("@oclif/core/lib/interfaces").CustomOptions>;
        'no-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        verbose: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        minimal: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        auto: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    run(): Promise<void>;
    /**
     * Manual mode: resolve an existing database and detect its title + date properties.
     * Fails if the database has no date-type property.
     */
    private manualSetup;
    /**
     * Auto mode: create a minimal "Daily Journal" database under a parent page.
     * Schema: Name (title) + Date (date) — intentionally minimal.
     */
    private autoSetup;
}
