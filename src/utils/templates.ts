/**
 * Templates Utility
 *
 * Reusable page presets — a named set of properties, optional body content,
 * and optional icon. Templates are NOT tied to a specific database; properties
 * are stored in simple format and expanded against the target schema at runtime.
 *
 * Stored at ~/.notion-cli/templates.json alongside bookmarks and daily config.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getCacheDir, ensureCacheDir } from './workspace-cache'

// -- Types --

export interface Template {
  properties?: Record<string, any>   // Simple properties format (flat JSON)
  content?: string                    // Markdown string → converted to blocks at use-time
  icon?: string                       // Emoji (e.g. "📋")
}

export interface TemplatesData {
  version: string
  templates: Record<string, Template> // keyed by lowercase name
}

// -- Constants --

const TEMPLATES_FILE = 'templates.json'
const TEMPLATES_VERSION = '1.0.0'

function getTemplatesPath(): string {
  return path.join(getCacheDir(), TEMPLATES_FILE)
}

// -- Core operations --

/** Load templates from disk. Returns empty structure if file doesn't exist. */
export async function loadTemplates(): Promise<TemplatesData> {
  try {
    const content = await fs.readFile(getTemplatesPath(), 'utf-8')
    const data = JSON.parse(content)

    if (!data.version || typeof data.templates !== 'object') {
      return createEmpty()
    }
    return data as TemplatesData
  } catch (error: any) {
    if (error.code === 'ENOENT') return createEmpty()
    return createEmpty()
  }
}

/** Save templates to disk (atomic write via tmp + rename). */
export async function saveTemplates(data: TemplatesData): Promise<void> {
  await ensureCacheDir()
  const filePath = getTemplatesPath()
  const tmpPath = `${filePath}.tmp`

  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
  await fs.rename(tmpPath, filePath)
}

/** Get a single template by name. Returns null if not found. */
export async function getTemplate(name: string): Promise<Template | null> {
  const data = await loadTemplates()
  return data.templates[name.toLowerCase()] ?? null
}

/** Save or update a template. */
export async function setTemplate(name: string, template: Template): Promise<void> {
  const data = await loadTemplates()
  data.templates[name.toLowerCase()] = template
  await saveTemplates(data)
}

/** Remove a template. Returns true if it existed. */
export async function removeTemplate(name: string): Promise<boolean> {
  const data = await loadTemplates()
  const key = name.toLowerCase()
  if (!(key in data.templates)) return false

  delete data.templates[key]
  await saveTemplates(data)
  return true
}

/** List all template names. */
export async function listTemplateNames(): Promise<string[]> {
  const data = await loadTemplates()
  return Object.keys(data.templates)
}

// -- Helpers --

function createEmpty(): TemplatesData {
  return { version: TEMPLATES_VERSION, templates: {} }
}
