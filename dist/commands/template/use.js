"use strict";
/**
 * Template Use Command
 *
 * Creates a page from a saved template. The template's simple properties
 * are expanded against the target database schema at runtime, making
 * templates portable across different databases.
 *
 * Target database can be specified via --to flag or defaults to the
 * default bookmark (same resolution as `quick` command).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion = require("../../notion");
const templates_1 = require("../../utils/templates");
const bookmarks_1 = require("../../utils/bookmarks");
const notion_resolver_1 = require("../../utils/notion-resolver");
const property_expander_1 = require("../../utils/property-expander");
const markdown_to_blocks_1 = require("../../utils/markdown-to-blocks");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
class TemplateUse extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(TemplateUse);
        try {
            // 1. Load template
            const template = await (0, templates_1.getTemplate)(args.name);
            if (!template) {
                this.error(`Template "${args.name}" not found.\nRun \`notion-cli template list\` to see saved templates.`);
                process.exit(1);
                return;
            }
            // 2. Resolve target database
            const target = flags.to || await (0, bookmarks_1.getDefaultBookmark)();
            if (!target) {
                this.error('No target database specified and no default bookmark set.\n' +
                    'Specify: notion-cli template use "name" --to DB_NAME_OR_ID --title "Title"\n' +
                    '   or set a default: notion-cli bookmark set inbox DB_ID --default');
                process.exit(1);
                return;
            }
            const dbId = await (0, notion_resolver_1.resolveNotionId)(target, 'database');
            // 3. Get database schema to find title property and expand simple props
            const schema = await notion.retrieveDataSource(dbId);
            const titlePropName = findTitleProperty(schema);
            // 4. Build properties — merge template props with title
            let expandedProperties = {};
            if (template.properties && Object.keys(template.properties).length > 0) {
                // Inject title into simple properties before expanding
                const merged = { ...template.properties, [titlePropName]: flags.title };
                expandedProperties = await (0, property_expander_1.expandSimpleProperties)(merged, schema.properties);
            }
            else {
                // No template properties — just set title
                expandedProperties = {
                    [titlePropName]: {
                        title: [{ text: { content: flags.title } }]
                    }
                };
            }
            // 5. Convert template content to blocks (if exists)
            const children = template.content
                ? (0, markdown_to_blocks_1.markdownToBlocks)(template.content)
                : undefined;
            // 6. Build page params
            const pageParams = {
                parent: { data_source_id: dbId },
                properties: expandedProperties,
                ...(children && { children }),
                ...(template.icon && { icon: { emoji: template.icon } }),
            };
            // 7. Create page
            const res = await notion.createPage(pageParams);
            // 8. Output
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: res,
                    template: args.name,
                    timestamp: new Date().toISOString()
                }, null, 2));
            }
            else {
                this.log(`Created from template "${args.name}": ${flags.title}`);
                this.log(res.url);
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'pages.create', resourceType: 'page' });
            if (flags.json) {
                this.log(JSON.stringify(cliError.toJSON(), null, 2));
            }
            else {
                this.error(cliError.toHumanString());
            }
            process.exit(1);
        }
    }
}
TemplateUse.description = 'Create a page from a saved template';
TemplateUse.aliases = ['tpl:use'];
TemplateUse.examples = [
    {
        description: 'Create a page from a template',
        command: '$ notion-cli template use "meeting" --to tasks --title "Sprint Planning"',
    },
    {
        description: 'Use default bookmark as target',
        command: '$ notion-cli template use "task" --title "Fix login bug"',
    },
];
TemplateUse.args = {
    name: core_1.Args.string({ required: true, description: 'Template name to use' }),
};
TemplateUse.flags = {
    to: core_1.Flags.string({
        description: 'Target bookmark name, database name, or ID (defaults to default bookmark)',
    }),
    title: core_1.Flags.string({
        char: 't',
        description: 'Page title (overrides any title in template properties)',
        required: true,
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = TemplateUse;
/**
 * Find the title property name in a database schema.
 * Notion databases always have exactly one title property, but its name varies.
 */
function findTitleProperty(schema) {
    if (schema.properties) {
        for (const [name, prop] of Object.entries(schema.properties)) {
            if (prop.type === 'title')
                return name;
        }
    }
    return 'Name';
}
