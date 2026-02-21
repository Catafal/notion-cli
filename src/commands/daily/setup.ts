/**
 * Daily Setup Command
 *
 * One-time configuration for the `daily` command.
 * Two modes:
 *   Manual — point to an existing database that has a Date property.
 *   Auto   — create a new "Daily Journal" database under a parent page.
 *
 * After setup, `notion-cli daily` works with zero arguments.
 */

import { Args, Command, Flags } from '@oclif/core'
import { CreateDatabaseParameters } from '@notionhq/client/build/src/api-endpoints'
import * as notion from '../../notion'
import { resolveNotionId } from '../../utils/notion-resolver'
import { saveDailyConfig, createDailyConfig } from '../../utils/daily-config'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, NotionCLIErrorCode, wrapNotionError } from '../../errors'

export default class DailySetup extends Command {
  static description = 'Configure the daily journal command'

  static examples = [
    {
      description: 'Point to an existing database (manual)',
      command: '$ notion-cli daily setup DB_ID_OR_URL',
    },
    {
      description: 'Auto-create a daily journal database',
      command: '$ notion-cli daily setup --auto PAGE_ID_OR_URL',
    },
  ]

  static args = {
    target: Args.string({
      required: false,
      description: 'Existing database ID or URL (manual mode)',
    }),
  }

  static flags = {
    auto: Flags.string({
      description: 'Auto-create database under this parent page (pass page ID or URL)',
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(DailySetup)

    try {
      // Must provide exactly one mode: target (manual) or --auto
      if (!args.target && !flags.auto) {
        this.error(
          'Provide a database ID (manual) or --auto PAGE_ID (auto-create).\n' +
          '  Manual: notion-cli daily setup DB_ID\n' +
          '  Auto:   notion-cli daily setup --auto PAGE_ID'
        )
        process.exit(1)
        return
      }
      if (args.target && flags.auto) {
        this.error('Cannot use both target database and --auto. Choose one mode.')
        process.exit(1)
        return
      }

      let databaseId: string
      let titleProperty: string
      let dateProperty: string

      if (flags.auto) {
        const result = await this.autoSetup(flags.auto)
        databaseId = result.databaseId
        titleProperty = result.titleProperty
        dateProperty = result.dateProperty
      } else {
        const result = await this.manualSetup(args.target!)
        databaseId = result.databaseId
        titleProperty = result.titleProperty
        dateProperty = result.dateProperty
      }

      // Persist config to ~/.notion-cli/daily.json
      const config = createDailyConfig(databaseId, titleProperty, dateProperty)
      await saveDailyConfig(config)

      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: config,
          timestamp: new Date().toISOString()
        }, null, 2))
      } else {
        this.log('Daily journal configured!')
        this.log(`  Database:       ${databaseId}`)
        this.log(`  Title property: ${titleProperty}`)
        this.log(`  Date property:  ${dateProperty}`)
        this.log('\nRun "notion-cli daily" to create today\'s entry.')
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, { endpoint: 'daily.setup', resourceType: 'database' })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }

  /**
   * Manual mode: resolve an existing database and detect its title + date properties.
   * Fails if the database has no date-type property.
   */
  private async manualSetup(target: string) {
    const dbId = await resolveNotionId(target, 'database')
    const schema = await notion.retrieveDataSource(dbId)

    let titleProperty = 'Name'
    let dateProperty: string | null = null

    if (schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        if ((prop as any).type === 'title') titleProperty = name
        // Take the first date property found
        if ((prop as any).type === 'date' && !dateProperty) dateProperty = name
      }
    }

    if (!dateProperty) {
      throw new NotionCLIError(
        NotionCLIErrorCode.VALIDATION_ERROR,
        'This database has no Date property.',
        [{ description: 'Add a Date property to your database in Notion, then run setup again.' }],
        { resourceType: 'database', attemptedId: dbId }
      )
    }

    return { databaseId: dbId, titleProperty, dateProperty }
  }

  /**
   * Auto mode: create a minimal "Daily Journal" database under a parent page.
   * Schema: Name (title) + Date (date) — intentionally minimal.
   */
  private async autoSetup(parentTarget: string) {
    const parentId = await resolveNotionId(parentTarget, 'page')

    const dbProps: CreateDatabaseParameters = {
      parent: { type: 'page_id', page_id: parentId },
      title: [{ type: 'text', text: { content: 'Daily Journal' } }],
      initial_data_source: {
        properties: {
          Name: { title: {} },
          Date: { date: {} },
        },
      },
    }

    const res = await notion.createDb(dbProps)

    return { databaseId: res.id, titleProperty: 'Name', dateProperty: 'Date' }
  }
}
