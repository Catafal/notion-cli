"use strict";
/**
 * Template Get Command
 *
 * Displays the full contents of a saved template — properties, body content,
 * and icon. Useful for inspecting a template before using it.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const templates_1 = require("../../utils/templates");
const base_flags_1 = require("../../base-flags");
class TemplateGet extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(TemplateGet);
        const template = await (0, templates_1.getTemplate)(args.name);
        if (!template) {
            this.error(`Template "${args.name}" not found.\nRun \`notion-cli template list\` to see saved templates.`);
            process.exit(1);
            return;
        }
        if (flags.json) {
            this.log(JSON.stringify({
                success: true,
                data: { name: args.name, ...template },
                timestamp: new Date().toISOString()
            }, null, 2));
            process.exit(0);
            return;
        }
        // Human-readable output
        this.log(`Template: ${args.name}`);
        if (template.icon)
            this.log(`Icon: ${template.icon}`);
        if (template.properties) {
            this.log(`Properties:`);
            this.log(JSON.stringify(template.properties, null, 2));
        }
        if (template.content) {
            this.log(`Content:`);
            this.log(template.content);
        }
        process.exit(0);
    }
}
TemplateGet.description = 'View a saved template';
TemplateGet.aliases = ['tpl:get'];
TemplateGet.examples = [
    {
        description: 'View a template',
        command: '$ notion-cli template get "meeting"',
    },
];
TemplateGet.args = {
    name: core_1.Args.string({ required: true, description: 'Template name' }),
};
TemplateGet.flags = {
    ...base_flags_1.AutomationFlags,
};
exports.default = TemplateGet;
