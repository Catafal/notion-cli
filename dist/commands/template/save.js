"use strict";
/**
 * Template Save Command
 *
 * Saves a reusable page template with properties, body content, and/or icon.
 * Templates use simple properties format (flat JSON) and are NOT tied to a
 * specific database — they're expanded against the target schema at use-time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const templates_1 = require("../../utils/templates");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
class TemplateSave extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(TemplateSave);
        // Must provide at least one field
        if (!flags.properties && !flags.content && !flags.icon) {
            this.error('Provide at least one of --properties, --content, or --icon.\n' +
                'Example: notion-cli template save "task" --properties \'{"Status": "To Do"}\'');
            process.exit(1);
            return;
        }
        // Parse and validate properties JSON
        let properties;
        if (flags.properties) {
            try {
                properties = JSON.parse(flags.properties);
                if (typeof properties !== 'object' || Array.isArray(properties) || properties === null) {
                    throw new Error('Properties must be a JSON object');
                }
            }
            catch (error) {
                throw new errors_1.NotionCLIError(errors_1.NotionCLIErrorCode.INVALID_JSON, `Invalid properties JSON: ${error.message}`, [{ description: 'Properties must be a JSON object like: {"Status": "To Do", "Priority": 3}' }]);
            }
        }
        // Build template object — only include fields that were provided
        const template = {
            ...(properties && { properties }),
            ...(flags.content && { content: flags.content }),
            ...(flags.icon && { icon: flags.icon }),
        };
        await (0, templates_1.setTemplate)(args.name, template);
        if (flags.json) {
            this.log(JSON.stringify({
                success: true,
                data: { name: args.name, ...template },
                timestamp: new Date().toISOString()
            }, null, 2));
        }
        else {
            this.log(`Saved template "${args.name}"`);
            if (properties)
                this.log(`  Properties: ${Object.keys(properties).join(', ')}`);
            if (flags.content)
                this.log(`  Content: ${flags.content.substring(0, 60)}${flags.content.length > 60 ? '...' : ''}`);
            if (flags.icon)
                this.log(`  Icon: ${flags.icon}`);
        }
        process.exit(0);
    }
}
TemplateSave.description = 'Save a reusable page template';
TemplateSave.aliases = ['tpl:save'];
TemplateSave.examples = [
    {
        description: 'Save a template with properties',
        command: '$ notion-cli template save "meeting" --properties \'{"Status": "To Do", "Type": "Meeting"}\'',
    },
    {
        description: 'Save with properties, body content, and icon',
        command: '$ notion-cli template save "standup" --properties \'{"Status": "In Progress"}\' --content "# Standup\\n\\n## Done\\n\\n## Doing\\n\\n## Blockers" --icon "🧑‍💻"',
    },
];
TemplateSave.args = {
    name: core_1.Args.string({ required: true, description: 'Template name (e.g. "meeting", "task")' }),
};
TemplateSave.flags = {
    properties: core_1.Flags.string({
        char: 'p',
        description: 'Properties as JSON (simple format, e.g. \'{"Status": "To Do"}\')',
    }),
    content: core_1.Flags.string({
        char: 'c',
        description: 'Markdown body content for the page',
    }),
    icon: core_1.Flags.string({
        description: 'Emoji icon (e.g. "📋")',
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = TemplateSave;
