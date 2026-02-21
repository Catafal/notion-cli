import { Command } from '@oclif/core'
import { loadBookmarks } from '../../utils/bookmarks'
import { tableFlags, formatTable } from '../../utils/table-formatter'
import { AutomationFlags } from '../../base-flags'

/**
 * List all saved bookmarks.
 * Shows name, type, ID, and which one is the default.
 */
export default class BookmarkList extends Command {
  static description = 'List all saved bookmarks'

  static aliases: string[] = ['bm:ls']

  static examples = [
    {
      description: 'List bookmarks',
      command: '$ notion-cli bookmark list',
    },
  ]

  static flags = {
    ...tableFlags,
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(BookmarkList)

    const data = await loadBookmarks()
    const entries = Object.entries(data.bookmarks)

    if (flags.json) {
      this.log(JSON.stringify({
        success: true,
        data: { bookmarks: data.bookmarks, default: data.default },
        timestamp: new Date().toISOString()
      }, null, 2))
      process.exit(0)
      return
    }

    if (entries.length === 0) {
      this.log('No bookmarks saved yet.')
      this.log('Create one with: notion-cli bookmark set <name> <ID_OR_URL>')
      process.exit(0)
      return
    }

    // Build rows for table display
    const rows = entries.map(([name, bm]) => ({
      name,
      type: bm.type,
      id: bm.id,
      default: name === data.default ? '*' : '',
    }))

    const columns = {
      name: {},
      type: {},
      id: {},
      default: {},
    }

    formatTable(rows, columns, { printLine: this.log.bind(this), ...flags })
    process.exit(0)
  }
}
