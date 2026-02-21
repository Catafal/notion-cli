import { expect } from 'chai'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { readTokenFromConfig, persistToken } from '../../src/utils/shell-config'

const CONFIG_DIR = path.join(os.homedir(), '.notion-cli')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

describe('shell-config', () => {
  // Back up and restore config.json around tests
  let originalConfig: string | null = null

  before(() => {
    try {
      originalConfig = fs.readFileSync(CONFIG_FILE, 'utf-8')
    } catch {
      originalConfig = null
    }
  })

  after(async () => {
    if (originalConfig !== null) {
      await fsPromises.writeFile(CONFIG_FILE, originalConfig, 'utf-8')
    } else {
      try { await fsPromises.unlink(CONFIG_FILE) } catch { /* didn't exist before */ }
    }
  })

  describe('readTokenFromConfig', () => {
    it('should return token from valid config.json', async () => {
      await fsPromises.mkdir(CONFIG_DIR, { recursive: true })
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify({ token: 'ntn_test123' }), 'utf-8')

      const result = readTokenFromConfig()
      expect(result).to.equal('ntn_test123')
    })

    it('should return null when config.json has no token key', async () => {
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify({ other: 'value' }), 'utf-8')

      const result = readTokenFromConfig()
      expect(result).to.equal(null)
    })

    it('should return null when config.json is malformed', async () => {
      await fsPromises.writeFile(CONFIG_FILE, 'not valid json {{{', 'utf-8')

      const result = readTokenFromConfig()
      expect(result).to.equal(null)
    })

    it('should return null when token is not a string', async () => {
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify({ token: 12345 }), 'utf-8')

      const result = readTokenFromConfig()
      expect(result).to.equal(null)
    })
  })

  describe('persistToken config.json writing', () => {
    it('should create config.json with token', async () => {
      try { await fsPromises.unlink(CONFIG_FILE) } catch { /* ok */ }

      await persistToken('ntn_persist_test')

      const raw = await fsPromises.readFile(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(raw)
      expect(config.token).to.equal('ntn_persist_test')
    })

    it('should preserve existing config.json keys when updating token', async () => {
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify({
        token: 'old_token',
        someOtherSetting: true,
      }, null, 2) + '\n', 'utf-8')

      await persistToken('ntn_new_token')

      const raw = await fsPromises.readFile(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(raw)
      expect(config.token).to.equal('ntn_new_token')
      expect(config.someOtherSetting).to.equal(true)
    })
  })
})
