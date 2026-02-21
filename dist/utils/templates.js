"use strict";
/**
 * Templates Utility
 *
 * Reusable page presets — a named set of properties, optional body content,
 * and optional icon. Templates are NOT tied to a specific database; properties
 * are stored in simple format and expanded against the target schema at runtime.
 *
 * Stored at ~/.notion-cli/templates.json alongside bookmarks and daily config.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTemplates = loadTemplates;
exports.saveTemplates = saveTemplates;
exports.getTemplate = getTemplate;
exports.setTemplate = setTemplate;
exports.removeTemplate = removeTemplate;
exports.listTemplateNames = listTemplateNames;
const fs = require("fs/promises");
const path = require("path");
const workspace_cache_1 = require("./workspace-cache");
// -- Constants --
const TEMPLATES_FILE = 'templates.json';
const TEMPLATES_VERSION = '1.0.0';
function getTemplatesPath() {
    return path.join((0, workspace_cache_1.getCacheDir)(), TEMPLATES_FILE);
}
// -- Core operations --
/** Load templates from disk. Returns empty structure if file doesn't exist. */
async function loadTemplates() {
    try {
        const content = await fs.readFile(getTemplatesPath(), 'utf-8');
        const data = JSON.parse(content);
        if (!data.version || typeof data.templates !== 'object') {
            return createEmpty();
        }
        return data;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return createEmpty();
        return createEmpty();
    }
}
/** Save templates to disk (atomic write via tmp + rename). */
async function saveTemplates(data) {
    await (0, workspace_cache_1.ensureCacheDir)();
    const filePath = getTemplatesPath();
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmpPath, filePath);
}
/** Get a single template by name. Returns null if not found. */
async function getTemplate(name) {
    var _a;
    const data = await loadTemplates();
    return (_a = data.templates[name.toLowerCase()]) !== null && _a !== void 0 ? _a : null;
}
/** Save or update a template. */
async function setTemplate(name, template) {
    const data = await loadTemplates();
    data.templates[name.toLowerCase()] = template;
    await saveTemplates(data);
}
/** Remove a template. Returns true if it existed. */
async function removeTemplate(name) {
    const data = await loadTemplates();
    const key = name.toLowerCase();
    if (!(key in data.templates))
        return false;
    delete data.templates[key];
    await saveTemplates(data);
    return true;
}
/** List all template names. */
async function listTemplateNames() {
    const data = await loadTemplates();
    return Object.keys(data.templates);
}
// -- Helpers --
function createEmpty() {
    return { version: TEMPLATES_VERSION, templates: {} };
}
