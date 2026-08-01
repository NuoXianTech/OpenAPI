import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SITE_SETTINGS_DEFAULTS } from '#shared/config/site-defaults'
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_NAMES
} from '~~/server/config/system-settings'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({
  database: null as unknown,
  deletedCacheKeys: [] as string[]
}))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

vi.mock('~~/server/utils/auth-secret', () => ({
  getAuthSecret: () => 'system-settings-database-test-secret-with-32-bytes'
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  async getSharedCache<TValue>(options: { loader: () => Promise<TValue> }): Promise<TValue> {
    return options.loader()
  },
  async deleteSharedCache(keys: string[]): Promise<void> {
    testContext.deletedCacheKeys.push(...keys)
  }
}))

const { systemSettingsService } = await import('~~/server/services/system-settings-service')

let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE system_settings (
      setting_key varchar(150) PRIMARY KEY NOT NULL,
      value jsonb NOT NULL,
      is_secret boolean NOT NULL DEFAULT false,
      description varchar(500) NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  testContext.database = drizzle(client, { schema })
})

afterAll(async () => {
  await client.close()
})

describe('system settings database service', () => {
  it('materializes registered defaults and stores updates as typed JSONB', async () => {
    await client.query(
      `INSERT INTO system_settings (setting_key, value, description)
       VALUES ($1, $2::jsonb, $3)`,
      ['internal.unregistered', JSON.stringify('private'), 'not registered']
    )

    const settings = await systemSettingsService.getSettings()

    expect(settings).toEqual(SITE_SETTINGS_DEFAULTS)
    expect(Object.keys(settings)).toHaveLength(SYSTEM_SETTING_NAMES.length)

    const registeredRows = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM system_settings
      WHERE setting_key <> 'internal.unregistered'
    `)
    expect(registeredRows.rows[0]?.count).toBe(SYSTEM_SETTING_NAMES.length)

    const storedTypes = await client.query<{ setting_key: string, value_type: string }>(`
      SELECT setting_key, jsonb_typeof(value) AS value_type
      FROM system_settings
      WHERE setting_key IN ('site.name', 'smtp.port', 'smtp.secure')
      ORDER BY setting_key
    `)
    expect(storedTypes.rows).toEqual([
      { setting_key: 'site.name', value_type: 'string' },
      { setting_key: 'smtp.port', value_type: 'number' },
      { setting_key: 'smtp.secure', value_type: 'boolean' }
    ])

    const updated = await systemSettingsService.update({
      siteName: 'Updated OpenAPI',
      smtpPort: 2525,
      smtpPass: 'smtp-plaintext-secret',
      clientIpSource: 'x_forwarded_for',
      trustedProxyCidrs: '127.0.0.1, ::1/128',
      clientIpForwardedHops: 2
    })
    expect(updated).toMatchObject({
      siteName: 'Updated OpenAPI',
      smtpPort: 2525,
      smtpPass: 'smtp-plaintext-secret',
      clientIpSource: 'x_forwarded_for',
      trustedProxyCidrs: '127.0.0.1/32\n::1/128',
      clientIpForwardedHops: 2
    })

    await expect(systemSettingsService.update({
      clientIpSource: 'cloudflare',
      trustedProxyCidrs: ''
    })).rejects.toMatchObject({ statusCode: 400 })

    const secretRows = await client.query<{ value: string, is_secret: boolean }>(`
      SELECT value, is_secret
      FROM system_settings
      WHERE setting_key = 'smtp.password'
    `)
    const storedSecret = secretRows.rows[0]
    expect(storedSecret?.is_secret).toBe(true)
    expect(storedSecret?.value).toMatch(/^enc:system-setting:v1:/)
    expect(storedSecret?.value).not.toContain('smtp-plaintext-secret')

    const safeAdminSettings = await systemSettingsService.getForAdmin()
    expect('smtpPass' in safeAdminSettings).toBe(false)
    expect(safeAdminSettings.secrets.hasSmtpPass).toBe(true)
    expect(testContext.deletedCacheKeys).toContain('cache:public:settings')

    const publicSettings = await systemSettingsService.getPublicSettings()
    expect(publicSettings.siteName).toBe('Updated OpenAPI')
    expect('internal.unregistered' in publicSettings).toBe(false)

    expect(systemSettingsService.registeredKeys()).toEqual(
      SYSTEM_SETTING_NAMES.map(name => SYSTEM_SETTING_DEFINITIONS[name].key)
    )
  })
})
