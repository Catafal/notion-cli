/**
 * Template Remove Command
 *
 * Deletes a saved template by name. No-op if it doesn't exist.
 */

import { Args, Command } from '@oclif/core'
import { removeTemplate } from '../../utils/templates'
import { AutomationFlags } from '../../base-flags'

export default class TemplateRemove extends Command {
  static description = 'Remove a saved template'

  static aliases: string[] = ['tpl:rm']

  static examples = [
    {
      description: 'Remove a template',
      command: '$ notion-cli template remove "meeting"',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Template name to remove' }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TemplateRemove)

    const existed = await removeTemplate(args.name)

    if (flags.json) {
      this.log(JSON.stringify({
        success: existed,
        data: { name: args.name, removed: existed },
        timestamp: new Date().toISOString()
      }, null, 2))
      process.exit(0)
      return
    }

    if (existed) {
      this.log(`Removed template "${args.name}"`)
    } else {
      this.log(`Template "${args.name}" not found.`)
      this.log('Run `notion-cli template list` to see saved templates.')
    }

    process.exit(0)
  }
}
