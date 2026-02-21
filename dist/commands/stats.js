"use strict";
/**
 * Stats Dashboard Command
 *
 * Shows a bird's-eye view of the Notion workspace: database count, user count,
 * property type breakdown, and per-database details. Data comes primarily from
 * the workspace cache (fast), with optional --live flag for page counts (slower).
 *
 *   notion-cli stats              # fast dashboard from cache
 *   notion-cli stats --live       # also fetch page counts per DB
 *   notion-cli stats --relations  # show database relation graph
 *   notion-cli stats --json       # JSON output for automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const workspace_cache_1 = require("../utils/workspace-cache");
const base_flags_1 = require("../base-flags");
const errors_1 = require("../errors");
const notion = require("../notion");
class Stats extends core_1.Command {
    async run() {
        var _a, _b;
        const { flags } = await this.parse(Stats);
        try {
            // 1. Load workspace cache — the primary data source (free, no API calls)
            const cache = await (0, workspace_cache_1.loadCache)();
            if (!cache || cache.databases.length === 0) {
                throw errors_1.NotionCLIErrorFactory.workspaceNotSynced('');
            }
            // 2. Fetch workspace info + users (cached API calls, fast)
            //    Both calls can fail if the token lacks permissions — handle gracefully.
            let workspaceName = 'Unknown';
            let userCount = null;
            try {
                const botInfo = await notion.botUser();
                workspaceName = ((_a = botInfo === null || botInfo === void 0 ? void 0 : botInfo.bot) === null || _a === void 0 ? void 0 : _a.workspace_name) || 'Unknown';
            }
            catch { /* bot info unavailable — non-critical */ }
            try {
                const usersResponse = await notion.listUser();
                userCount = usersResponse.results.length;
            }
            catch { /* users endpoint needs extra permissions — skip gracefully */ }
            // 3. Aggregate property types across all databases (from cache, no API)
            const propertyTypeCounts = {};
            const dbDetails = [];
            for (const db of cache.databases) {
                const propCount = db.properties ? Object.keys(db.properties).length : 0;
                dbDetails.push({ title: db.title, shortId: db.id.slice(0, 8), propertyCount: propCount });
                // Count each property type across the workspace
                if (db.properties) {
                    for (const prop of Object.values(db.properties)) {
                        const type = prop.type || 'unknown';
                        propertyTypeCounts[type] = (propertyTypeCounts[type] || 0) + 1;
                    }
                }
            }
            // Sort databases by property count (most complex first)
            dbDetails.sort((a, b) => b.propertyCount - a.propertyCount);
            // 3b. Extract database relation edges (from cache, no API calls).
            //     Each relation property points to a target database via database_id or data_source_id.
            //     We resolve the target name by looking it up in the cache.
            const idToTitle = new Map(cache.databases.flatMap(db => [
                [db.id, db.title],
                // Also index by database_id (relation properties may use either ID format)
                ...(db.url ? [[db.url, db.title]] : []),
            ]));
            const relationEdges = [];
            for (const db of cache.databases) {
                if (!db.properties)
                    continue;
                for (const prop of Object.values(db.properties)) {
                    const p = prop;
                    if (p.type !== 'relation' || !p.relation)
                        continue;
                    // Resolve target name — try data_source_id first, then database_id
                    const targetId = p.relation.data_source_id || p.relation.database_id || '';
                    const target = idToTitle.get(targetId) || `Unknown (${targetId.slice(0, 8)})`;
                    relationEdges.push({
                        source: db.title,
                        sourceId: db.id.slice(0, 8),
                        property: p.name || Object.keys(db.properties).find(k => db.properties[k] === prop) || '?',
                        target,
                        targetId: targetId.slice(0, 8),
                    });
                }
            }
            // 4. Optional: fetch page counts per database (expensive, behind --live flag)
            let totalPages;
            if (flags.live) {
                totalPages = 0;
                for (const db of cache.databases) {
                    try {
                        const pages = await notion.fetchAllPagesInDS(db.id);
                        const count = pages.length;
                        totalPages += count;
                        // Update the matching entry in dbDetails
                        const detail = dbDetails.find(d => d.title === db.title);
                        if (detail)
                            detail.pages = count;
                    }
                    catch {
                        // If a DB query fails (permissions, deleted), skip it gracefully
                        const detail = dbDetails.find(d => d.title === db.title);
                        if (detail)
                            detail.pages = -1;
                    }
                }
                // Re-sort by page count when live data is available
                dbDetails.sort((a, b) => { var _a, _b; return ((_a = b.pages) !== null && _a !== void 0 ? _a : 0) - ((_b = a.pages) !== null && _b !== void 0 ? _b : 0); });
            }
            // 5. Calculate cache age for display
            const cacheAgeMs = Date.now() - new Date(cache.lastSync).getTime();
            const cacheAgeLabel = this.formatAge(cacheAgeMs);
            // 6. Sort property types by count (most used first)
            const sortedTypes = Object.entries(propertyTypeCounts)
                .sort(([, a], [, b]) => b - a);
            // --- Output ---
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: {
                        workspace: workspaceName,
                        databases: {
                            count: cache.databases.length,
                            items: dbDetails,
                        },
                        ...(userCount !== null && { users: { count: userCount } }),
                        property_types: propertyTypeCounts,
                        ...(totalPages !== undefined && { pages: { total: totalPages } }),
                        ...(flags.relations && { relations: relationEdges }),
                        cache: {
                            last_sync: cache.lastSync,
                            age_ms: cacheAgeMs,
                        },
                    },
                    timestamp: new Date().toISOString(),
                }, null, 2));
                process.exit(0);
                return;
            }
            // Human-readable dashboard
            this.log('');
            const userLabel = userCount !== null ? ` | Users: ${userCount}` : '';
            const summary = totalPages !== undefined
                ? `Databases: ${cache.databases.length}${userLabel} | Total Pages: ${totalPages}`
                : `Databases: ${cache.databases.length}${userLabel}`;
            this.log(`Workspace: ${workspaceName}`);
            this.log(summary);
            // Database table — includes short ID to disambiguate duplicate names
            this.log('\nDatabases');
            this.log('─'.repeat(65));
            const nameWidth = 36;
            const header = flags.live
                ? `${'Name'.padEnd(nameWidth)}  ${'ID'.padEnd(8)}  ${'Props'.padStart(5)}  ${'Pages'.padStart(5)}`
                : `${'Name'.padEnd(nameWidth)}  ${'ID'.padEnd(8)}  ${'Props'.padStart(5)}`;
            this.log(header);
            for (const db of dbDetails) {
                const name = db.title.length > nameWidth
                    ? db.title.slice(0, nameWidth - 1) + '…'
                    : db.title.padEnd(nameWidth);
                const props = String(db.propertyCount).padStart(5);
                if (flags.live) {
                    const pages = db.pages === -1 ? '  err' : String((_b = db.pages) !== null && _b !== void 0 ? _b : '-').padStart(5);
                    this.log(`${name}  ${db.shortId}  ${props}  ${pages}`);
                }
                else {
                    this.log(`${name}  ${db.shortId}  ${props}`);
                }
            }
            // Property type breakdown
            this.log('\nProperty Types');
            this.log('─'.repeat(30));
            for (const [type, count] of sortedTypes) {
                this.log(`${type.padEnd(20)}  ${String(count).padStart(4)}`);
            }
            // Relation graph — shows which databases connect to which
            if (flags.relations) {
                this.log('\nRelation Graph');
                this.log('─'.repeat(55));
                // Group edges by source database
                const bySource = new Map();
                for (const edge of relationEdges) {
                    const key = edge.source;
                    if (!bySource.has(key))
                        bySource.set(key, []);
                    bySource.get(key).push(edge);
                }
                // Databases with relations
                for (const [source, edges] of bySource) {
                    const srcId = edges[0].sourceId;
                    this.log(`${source}  ${srcId}`);
                    for (const edge of edges) {
                        this.log(`  → ${edge.target}  (via "${edge.property}")`);
                    }
                }
                // Databases without any relations
                const sourcesWithRelations = new Set(bySource.keys());
                const isolated = cache.databases
                    .filter(db => !sourcesWithRelations.has(db.title))
                    .map(db => db.title);
                if (isolated.length > 0) {
                    this.log(`\nIsolated (no relations): ${isolated.join(', ')}`);
                }
            }
            // Footer
            this.log(`\nCache: synced ${cacheAgeLabel}`);
            if (!flags.live) {
                this.log('Tip: Run with --live to fetch page counts per database.');
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    endpoint: 'workspace.stats',
                    resourceType: 'workspace',
                });
            if (flags.json) {
                this.log(JSON.stringify(cliError.toJSON(), null, 2));
            }
            else {
                this.error(cliError.toHumanString());
            }
            process.exit(1);
        }
    }
    /** Convert milliseconds to a human-friendly age string (e.g. "2h ago"). */
    formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 1)
            return 'just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
Stats.description = 'Show workspace statistics dashboard';
Stats.aliases = ['dashboard'];
Stats.examples = [
    {
        description: 'Show workspace statistics',
        command: '$ notion-cli stats',
    },
    {
        description: 'Include page counts per database (slower)',
        command: '$ notion-cli stats --live',
    },
    {
        description: 'Show database relation graph',
        command: '$ notion-cli stats --relations',
    },
    {
        description: 'JSON output for automation',
        command: '$ notion-cli stats --json',
    },
];
Stats.flags = {
    ...base_flags_1.AutomationFlags,
    live: core_1.Flags.boolean({
        description: 'Fetch page counts per database (requires API calls)',
        default: false,
    }),
    relations: core_1.Flags.boolean({
        description: 'Show database relation graph (from cache, no API calls)',
        default: false,
    }),
};
exports.default = Stats;
