"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion_resolver_1 = require("../utils/notion-resolver");
const errors_1 = require("../errors");
const interactive_navigator_1 = require("../utils/interactive-navigator");
class Browse extends core_1.Command {
    async run() {
        const { args } = await this.parse(Browse);
        try {
            const pageId = await (0, notion_resolver_1.resolveNotionId)(args.page_id, 'page');
            await (0, interactive_navigator_1.startNavigator)(pageId, this.log.bind(this));
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    resourceType: 'page',
                    attemptedId: args.page_id,
                    endpoint: 'browse',
                });
            this.error(cliError.toHumanString());
        }
    }
}
Browse.description = 'Interactively navigate a Notion page tree with arrow keys';
Browse.aliases = ['nav'];
Browse.examples = [
    {
        description: 'Browse a page by ID',
        command: '$ notion-cli browse PAGE_ID',
    },
    {
        description: 'Browse a page by URL',
        command: '$ notion-cli browse https://notion.so/My-Page-abc123',
    },
];
Browse.args = {
    page_id: core_1.Args.string({
        required: true,
        description: 'Page ID, URL, or name to start browsing from',
    }),
};
exports.default = Browse;
