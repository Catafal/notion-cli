"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const table_formatter_1 = require("../../utils/table-formatter");
const notion = require("../../notion");
const helper_1 = require("../../helper");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
const readline = require("readline");
const notion_resolver_1 = require("../../utils/notion-resolver");
class BatchDelete extends core_1.Command {
    /**
     * Read IDs from stdin, one per line. Times out after 5s if no input.
     */
    async readStdin() {
        return new Promise((resolve, reject) => {
            const ids = [];
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: false,
            });
            rl.on('line', (line) => {
                const trimmed = line.trim();
                if (trimmed) {
                    ids.push(trimmed);
                }
            });
            rl.on('close', () => {
                resolve(ids);
            });
            rl.on('error', (err) => {
                reject(err);
            });
            setTimeout(() => {
                rl.close();
                resolve(ids);
            }, 5000);
        });
    }
    /**
     * Delete a single block. Resolves URL/name/ID first, then calls Notion API.
     */
    async deleteResource(id) {
        try {
            const resolvedId = await (0, notion_resolver_1.resolveNotionId)(id, 'page');
            const data = await notion.deleteBlock(resolvedId);
            return {
                id,
                success: true,
                data,
            };
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    resourceType: 'block',
                    attemptedId: id,
                    endpoint: 'blocks.delete'
                });
            return {
                id,
                success: false,
                error: cliError.code,
                message: cliError.userMessage,
            };
        }
    }
    async run() {
        const { args, flags } = await this.parse(BatchDelete);
        try {
            // Collect IDs from args, --ids flag, or stdin
            let ids = [];
            if (args.ids) {
                ids = args.ids.split(',').map(id => id.trim()).filter(id => id);
            }
            else if (flags.ids) {
                ids = flags.ids.split(',').map(id => id.trim()).filter(id => id);
            }
            else if (!process.stdin.isTTY) {
                ids = await this.readStdin();
            }
            if (ids.length === 0) {
                throw new errors_1.NotionCLIError(errors_1.NotionCLIErrorCode.VALIDATION_ERROR, 'No IDs provided. Use --ids flag, positional argument, or pipe IDs via stdin', [
                    {
                        description: 'Provide IDs via --ids flag',
                        command: 'notion-cli batch delete --ids ID1,ID2,ID3'
                    },
                    {
                        description: 'Or pipe IDs from a file',
                        command: 'cat block_ids.txt | notion-cli batch delete'
                    }
                ]);
            }
            // Delete all blocks in parallel
            const results = await Promise.all(ids.map(id => this.deleteResource(id)));
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;
            // JSON output for automation
            if (flags.json) {
                this.log(JSON.stringify({
                    success: successCount > 0,
                    total: results.length,
                    succeeded: successCount,
                    failed: failureCount,
                    results,
                    timestamp: new Date().toISOString(),
                }, null, 2));
                process.exit(failureCount === 0 ? 0 : 1);
                return;
            }
            // Compact JSON output
            if (flags['compact-json']) {
                (0, helper_1.outputCompactJson)({
                    total: results.length,
                    succeeded: successCount,
                    failed: failureCount,
                    results,
                });
                process.exit(failureCount === 0 ? 0 : 1);
                return;
            }
            // Raw JSON output
            if (flags.raw) {
                (0, helper_1.outputRawJson)(results);
                process.exit(failureCount === 0 ? 0 : 1);
                return;
            }
            // Table output (default)
            const tableData = results.map(result => ({
                id: result.id,
                status: result.success ? 'deleted' : 'failed',
                content: result.success && result.data
                    ? (0, helper_1.getBlockPlainText)(result.data) || '-'
                    : result.message || result.error || 'Unknown error',
            }));
            const columns = {
                id: {},
                status: {},
                content: {},
            };
            const options = {
                printLine: this.log.bind(this),
                ...flags,
            };
            (0, table_formatter_1.formatTable)(tableData, columns, options);
            this.log(`\nTotal: ${results.length} | Deleted: ${successCount} | Failed: ${failureCount}`);
            process.exit(failureCount === 0 ? 0 : 1);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'batch.delete' });
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
BatchDelete.description = 'Batch delete multiple blocks in parallel';
BatchDelete.aliases = ['batch:d'];
BatchDelete.examples = [
    {
        description: 'Delete multiple blocks via --ids flag',
        command: '$ notion-cli batch delete --ids BLOCK_ID_1,BLOCK_ID_2,BLOCK_ID_3 --json',
    },
    {
        description: 'Delete blocks from stdin (one ID per line)',
        command: '$ cat block_ids.txt | notion-cli batch delete --json',
    },
    {
        description: 'Delete using Notion URLs (auto-resolved)',
        command: '$ notion-cli batch delete --ids "https://notion.so/Page-abc123,https://notion.so/Other-def456"',
    },
];
BatchDelete.args = {
    ids: core_1.Args.string({
        required: false,
        description: 'Comma-separated list of block IDs to delete (or use --ids flag or stdin)',
    }),
};
BatchDelete.flags = {
    ids: core_1.Flags.string({
        description: 'Comma-separated list of block IDs to delete',
    }),
    raw: core_1.Flags.boolean({
        char: 'r',
        description: 'output raw json',
    }),
    ...table_formatter_1.tableFlags,
    ...base_flags_1.OutputFormatFlags,
    ...base_flags_1.AutomationFlags,
};
exports.default = BatchDelete;
