import { Command, Args } from '@oclif/core'
import * as readline from 'readline'
import { AutomationFlags } from '../../base-flags'
import {
  NotionCLIError,
  NotionCLIErrorCode,
  wrapNotionError
} from '../../errors'
import { persistToken } from '../../utils/shell-config'
import { maskToken } from '../../utils/token-validator'

export default class ConfigSetToken extends Command {
  static description = 'Set NOTION_TOKEN in your shell configuration file'

  static aliases: string[] = ['config:token']

  static examples = [
    {
      description: 'Set Notion token interactively',
      command: 'notion-cli config set-token',
    },
    {
      description: 'Set Notion token directly',
      command: 'notion-cli config set-token ntn_abc123...',
    },
    {
      description: 'Set token with JSON output',
      command: 'notion-cli config set-token ntn_abc123... --json',
    },
  ]

  static args = {
    token: Args.string({
      description: 'Notion integration token (starts with secret_ or ntn_)',
      required: false,
    }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigSetToken)

    try {
      // Get token from args or prompt
      let token = args.token

      if (!token) {
        if (flags.json) {
          throw new NotionCLIError(
            NotionCLIErrorCode.TOKEN_MISSING,
            'Token required in JSON mode',
            [
              {
                description: 'Provide the token as an argument',
                command: 'notion-cli config set-token ntn_your_token_here --json'
              }
            ]
          )
        }

        // Interactive prompt
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        token = await new Promise<string>((resolve) => {
          rl.question('Enter your Notion integration token: ', (answer: string) => {
            rl.close()
            resolve(answer.trim())
          })
        })
      }

      // Validate token format — Notion tokens start with "secret_" (legacy) or "ntn_" (current)
      if (!token || (!token.startsWith('secret_') && !token.startsWith('ntn_'))) {
        throw new NotionCLIError(
          NotionCLIErrorCode.TOKEN_INVALID,
          'Invalid token format - Notion tokens must start with "secret_" or "ntn_"',
          [
            {
              description: 'Get your integration token from Notion',
              link: 'https://developers.notion.com/docs/create-a-notion-integration'
            },
            {
              description: 'Tokens should look like: ntn_abc123... or secret_abc123...',
            }
          ],
          {
            userInput: maskToken(token),
            metadata: { tokenFormat: 'invalid' }
          }
        )
      }

      // Persist token to shell rc file (~/.zshrc, ~/.bashrc, etc.)
      const { rcFile, shell } = await persistToken(token)

      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          message: 'Token saved successfully',
          rcFile,
          shell,
          nextSteps: [
            `Reload your shell: source ${rcFile}`,
            'Run: notion-cli sync',
          ],
        }, null, 2))
      } else {
        this.log(`\n✓ Token saved to ${rcFile}`)
        this.log('\nNext steps:')
        this.log(`  1. Reload your shell: source ${rcFile}`)
        this.log(`  2. Or restart your terminal`)
        this.log(`  3. Run: notion-cli sync`)
        this.log('\nWould you like to sync your workspace now? (y/n)')

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        const answer = await new Promise<string>((resolve) => {
          rl.question('> ', (answer: string) => {
            rl.close()
            resolve(answer.trim().toLowerCase())
          })
        })

        if (answer === 'y' || answer === 'yes') {
          // Set token in current process
          process.env.NOTION_TOKEN = token

          // Run sync command - dynamic import to avoid circular dependencies
          this.log('\nRunning sync...\n')
          const { default: Sync } = await import('../sync.js')
          await Sync.run([])
        } else {
          this.log('\nSkipping sync. You can run it manually with: notion-cli sync')
        }
      }

      process.exit(0)
    } catch (error: unknown) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error instanceof Error ? error : new Error(String(error)), {
            endpoint: 'config.set-token'
          })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }

      process.exit(1)
    }
  }

}
