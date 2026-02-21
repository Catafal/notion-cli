/**
 * Templates Utility
 *
 * Reusable page presets — a named set of properties, optional body content,
 * and optional icon. Templates are NOT tied to a specific database; properties
 * are stored in simple format and expanded against the target schema at runtime.
 *
 * Stored at ~/.notion-cli/templates.json alongside bookmarks and daily config.
 */
export interface Template {
    properties?: Record<string, any>;
    content?: string;
    icon?: string;
}
export interface TemplatesData {
    version: string;
    templates: Record<string, Template>;
}
/** Load templates from disk. Returns empty structure if file doesn't exist. */
export declare function loadTemplates(): Promise<TemplatesData>;
/** Save templates to disk (atomic write via tmp + rename). */
export declare function saveTemplates(data: TemplatesData): Promise<void>;
/** Get a single template by name. Returns null if not found. */
export declare function getTemplate(name: string): Promise<Template | null>;
/** Save or update a template. */
export declare function setTemplate(name: string, template: Template): Promise<void>;
/** Remove a template. Returns true if it existed. */
export declare function removeTemplate(name: string): Promise<boolean>;
/** List all template names. */
export declare function listTemplateNames(): Promise<string[]>;
