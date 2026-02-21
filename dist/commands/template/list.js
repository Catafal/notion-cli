"use strict";
/**
 * Template List Command
 *
 * Shows all saved templates in a table with name, property count,
 * content indicator, and icon.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const templates_1 = require("../../utils/templates");
const table_formatter_1 = require("../../utils/table-formatter");
const base_flags_1 = require("../../base-flags");
class TemplateList extends core_1.Command {
    async run() {
        const { flags } = await this.parse(TemplateList);
        const data = await (0, templates_1.loadTemplates)();
        const entries = Object.entries(data.templates);
        if (flags.json) {
            this.log(JSON.stringify({
                success: true,
                data: { templates: data.templates },
                timestamp: new Date().toISOString()
            }, null, 2));
            process.exit(0);
            return;
        }
        if (entries.length === 0) {
            this.log('No templates saved yet.');
            this.log('Create one with: notion-cli template save <name> --properties \'{"Status": "To Do"}\'');
            process.exit(0);
            return;
        }
        // Build rows for table display
        const rows = entries.map(([name, tmpl]) => ({
            name,
            properties: tmpl.properties ? Object.keys(tmpl.properties).length : 0,
            content: tmpl.content ? 'yes' : '',
            icon: tmpl.icon || '',
        }));
        const columns = {
            name: {},
            properties: { header: '# props' },
            content: {},
            icon: {},
        };
        (0, table_formatter_1.formatTable)(rows, columns, { printLine: this.log.bind(this), ...flags });
        process.exit(0);
    }
}
TemplateList.description = 'List all saved templates';
TemplateList.aliases = ['tpl:ls'];
TemplateList.examples = [
    {
        description: 'List all templates',
        command: '$ notion-cli template list',
    },
];
TemplateList.flags = {
    ...table_formatter_1.tableFlags,
    ...base_flags_1.AutomationFlags,
};
exports.default = TemplateList;
