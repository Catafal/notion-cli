import { Args, Command } from '@oclif/core'
import { removeBookmark } from '../../utils/bookmarks'
import { AutomationFlags } from '../../base-flags'

/**
 * Remove a saved bookmark by name.
 * If the removed bookmark was the default, the default is cleared.
 */
export default class BookmarkRemove extends Command {
  static description = 'Remove a saved bookmark'

  static aliases: string[] = ['bm:rm']

  static examples = [
    {
      description: 'Remove a bookmark',
      command: '$ notion-cli bookmark remove inbox',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Bookmark name to remove' }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BookmarkRemove)

    const existed = await removeBookmark(args.name)

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
      this.log(`Removed bookmark "${args.name}"`)
    } else {
      this.log(`Bookmark "${args.name}" not found.`)
      this.log('Run `notion-cli bookmark list` to see saved bookmarks.')
    }

    process.exit(0)
  }
}
