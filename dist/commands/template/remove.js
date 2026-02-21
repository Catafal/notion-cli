"use strict";
/**
 * Template Remove Command
 *
 * Deletes a saved template by name. No-op if it doesn't exist.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const templates_1 = require("../../utils/templates");
const base_flags_1 = require("../../base-flags");
class TemplateRemove extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(TemplateRemove);
        const existed = await (0, templates_1.removeTemplate)(args.name);
        if (flags.json) {
            this.log(JSON.stringify({
                success: existed,
                data: { name: args.name, removed: existed },
                timestamp: new Date().toISOString()
            }, null, 2));
            process.exit(0);
            return;
        }
        if (existed) {
            this.log(`Removed template "${args.name}"`);
        }
        else {
            this.log(`Template "${args.name}" not found.`);
            this.log('Run `notion-cli template list` to see saved templates.');
        }
        process.exit(0);
    }
}
TemplateRemove.description = 'Remove a saved template';
TemplateRemove.aliases = ['tpl:rm'];
TemplateRemove.examples = [
    {
        description: 'Remove a template',
        command: '$ notion-cli template remove "meeting"',
    },
];
TemplateRemove.args = {
    name: core_1.Args.string({ required: true, description: 'Template name to remove' }),
};
TemplateRemove.flags = {
    ...base_flags_1.AutomationFlags,
};
exports.default = TemplateRemove;
