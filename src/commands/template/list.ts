/**
 * Template List Command
 *
 * Shows all saved templates in a table with name, property count,
 * content indicator, and icon.
 */

import { Command } from '@oclif/core'
import { loadTemplates } from '../../utils/templates'
import { tableFlags, formatTable } from '../../utils/table-formatter'
import { AutomationFlags } from '../../base-flags'

export default class TemplateList extends Command {
  static description = 'List all saved templates'

  static aliases: string[] = ['tpl:ls']

  static examples = [
    {
      description: 'List all templates',
      command: '$ notion-cli template list',
    },
  ]

  static flags = {
    ...tableFlags,
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(TemplateList)

    const data = await loadTemplates()
    const entries = Object.entries(data.templates)

    if (flags.json) {
      this.log(JSON.stringify({
        success: true,
        data: { templates: data.templates },
        timestamp: new Date().toISOString()
      }, null, 2))
      process.exit(0)
      return
    }

    if (entries.length === 0) {
      this.log('No templates saved yet.')
      this.log('Create one with: notion-cli template save <name> --properties \'{"Status": "To Do"}\'')
      process.exit(0)
      return
    }

    // Build rows for table display
    const rows = entries.map(([name, tmpl]) => ({
      name,
      properties: tmpl.properties ? Object.keys(tmpl.properties).length : 0,
      content: tmpl.content ? 'yes' : '',
      icon: tmpl.icon || '',
    }))

    const columns = {
      name: {},
      properties: { header: '# props' },
      content: {},
      icon: {},
    }

    formatTable(rows, columns, { printLine: this.log.bind(this), ...flags })
    process.exit(0)
  }
}
