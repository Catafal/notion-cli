"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion = require("../../notion");
const notion_resolver_1 = require("../../utils/notion-resolver");
const daily_config_1 = require("../../utils/daily-config");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
class DailySetup extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(DailySetup);
        try {
            // Must provide exactly one mode: target (manual) or --auto
            if (!args.target && !flags.auto) {
                this.error('Provide a database ID (manual) or --auto PAGE_ID (auto-create).\n' +
                    '  Manual: notion-cli daily setup DB_ID\n' +
                    '  Auto:   notion-cli daily setup --auto PAGE_ID');
                process.exit(1);
                return;
            }
            if (args.target && flags.auto) {
                this.error('Cannot use both target database and --auto. Choose one mode.');
                process.exit(1);
                return;
            }
            let databaseId;
            let titleProperty;
            let dateProperty;
            if (flags.auto) {
                const result = await this.autoSetup(flags.auto);
                databaseId = result.databaseId;
                titleProperty = result.titleProperty;
                dateProperty = result.dateProperty;
            }
            else {
                const result = await this.manualSetup(args.target);
                databaseId = result.databaseId;
                titleProperty = result.titleProperty;
                dateProperty = result.dateProperty;
            }
            // Persist config to ~/.notion-cli/daily.json
            const config = (0, daily_config_1.createDailyConfig)(databaseId, titleProperty, dateProperty);
            await (0, daily_config_1.saveDailyConfig)(config);
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: config,
                    timestamp: new Date().toISOString()
                }, null, 2));
            }
            else {
                this.log('Daily journal configured!');
                this.log(`  Database:       ${databaseId}`);
                this.log(`  Title property: ${titleProperty}`);
                this.log(`  Date property:  ${dateProperty}`);
                this.log('\nRun "notion-cli daily" to create today\'s entry.');
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'daily.setup', resourceType: 'database' });
            if (flags.json) {
                this.log(JSON.stringify(cliError.toJSON(), null, 2));
            }
            else {
                this.error(cliError.toHumanString());
            }
            process.exit(1);
        }
    }
    /**
     * Manual mode: resolve an existing database and detect its title + date properties.
     * Fails if the database has no date-type property.
     */
    async manualSetup(target) {
        const dbId = await (0, notion_resolver_1.resolveNotionId)(target, 'database');
        const schema = await notion.retrieveDataSource(dbId);
        let titleProperty = 'Name';
        let dateProperty = null;
        if (schema.properties) {
            for (const [name, prop] of Object.entries(schema.properties)) {
                if (prop.type === 'title')
                    titleProperty = name;
                // Take the first date property found
                if (prop.type === 'date' && !dateProperty)
                    dateProperty = name;
            }
        }
        if (!dateProperty) {
            throw new errors_1.NotionCLIError(errors_1.NotionCLIErrorCode.VALIDATION_ERROR, 'This database has no Date property.', [{ description: 'Add a Date property to your database in Notion, then run setup again.' }], { resourceType: 'database', attemptedId: dbId });
        }
        return { databaseId: dbId, titleProperty, dateProperty };
    }
    /**
     * Auto mode: create a minimal "Daily Journal" database under a parent page.
     * Schema: Name (title) + Date (date) — intentionally minimal.
     */
    async autoSetup(parentTarget) {
        const parentId = await (0, notion_resolver_1.resolveNotionId)(parentTarget, 'page');
        const dbProps = {
            parent: { type: 'page_id', page_id: parentId },
            title: [{ type: 'text', text: { content: 'Daily Journal' } }],
            initial_data_source: {
                properties: {
                    Name: { title: {} },
                    Date: { date: {} },
                },
            },
        };
        const res = await notion.createDb(dbProps);
        return { databaseId: res.id, titleProperty: 'Name', dateProperty: 'Date' };
    }
}
DailySetup.description = 'Configure the daily journal command';
DailySetup.examples = [
    {
        description: 'Point to an existing database (manual)',
        command: '$ notion-cli daily setup DB_ID_OR_URL',
    },
    {
        description: 'Auto-create a daily journal database',
        command: '$ notion-cli daily setup --auto PAGE_ID_OR_URL',
    },
];
DailySetup.args = {
    target: core_1.Args.string({
        required: false,
        description: 'Existing database ID or URL (manual mode)',
    }),
};
DailySetup.flags = {
    auto: core_1.Flags.string({
        description: 'Auto-create database under this parent page (pass page ID or URL)',
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = DailySetup;
