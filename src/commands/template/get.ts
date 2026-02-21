/**
 * Template Get Command
 *
 * Displays the full contents of a saved template — properties, body content,
 * and icon. Useful for inspecting a template before using it.
 */

import { Args, Command } from '@oclif/core'
import { getTemplate } from '../../utils/templates'
import { AutomationFlags } from '../../base-flags'

export default class TemplateGet extends Command {
  static description = 'View a saved template'

  static aliases: string[] = ['tpl:get']

  static examples = [
    {
      description: 'View a template',
      command: '$ notion-cli template get "meeting"',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Template name' }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TemplateGet)

    const template = await getTemplate(args.name)

    if (!template) {
      this.error(`Template "${args.name}" not found.\nRun \`notion-cli template list\` to see saved templates.`)
      process.exit(1)
      return
    }

    if (flags.json) {
      this.log(JSON.stringify({
        success: true,
        data: { name: args.name, ...template },
        timestamp: new Date().toISOString()
      }, null, 2))
      process.exit(0)
      return
    }

    // Human-readable output
    this.log(`Template: ${args.name}`)
    if (template.icon) this.log(`Icon: ${template.icon}`)
    if (template.properties) {
      this.log(`Properties:`)
      this.log(JSON.stringify(template.properties, null, 2))
    }
    if (template.content) {
      this.log(`Content:`)
      this.log(template.content)
    }

    process.exit(0)
  }
}
