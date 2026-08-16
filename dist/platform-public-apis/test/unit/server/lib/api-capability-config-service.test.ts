import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_CAPABILITY_CONTROL, type ApiCapabilityDefinition } from '#shared/types/api-capability'
import * as schema from '~~/server/db/schema'

const definition: ApiCapabilityDefinition = {
  title: 'Example capabilities',
  description: 'Test definition',
  fields: [
    {
      key: 'isFeatureEnabled',
      control: API_CAPABILITY_CONTROL.boolean,
      label: 'Feature',
      description: 'Feature switch',
      defaultValue: true
    },
    {
      key: 'serviceCookie',
      control: API_CAPABILITY_CONTROL.text,
      label: 'Cookie',
      description: 'Service cookie',
      defaultValue: '',
      isSecret: true
    }
  ]
}

const testContext = vi.hoisted(() => ({
  database: null as unknown,
  cache: new Map<string, unknown>(),
  deletedKeys: [] as string[]
}))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

vi.mock('~~/server/lib/api-capabilities/definition-registry', () => ({
  getApiCapabilityDefinition(pathVersion: string, code: string) {
    return pathVersion === 'v1' && code === 'example' ? definition : null
  }
}))

vi.mock('~~/server/utils/auth-secret', () => ({
  getAuthSecret: () => 'test-capability-secret'
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  async getSharedCache<TValue>(options: {
    key: string
    loader: () => Promise<TValue>
  }): Promise<TValue> {
    if (testContext.cache.has(options.key)) return testContext.cache.get(options.key) as TValue
    const value = await options.loader()
    testContext.cache.set(options.key, value)
    return value
  },
  async deleteSharedCache(keys: string[]): Promise<void> {
    for (const key of keys) {
      testContext.cache.delete(key)
      testContext.deletedKeys.push(key)
    }
  }
}))

const {
  loadApiCapabilityConfig,
  maskApiCapabilitySecrets,
  saveApiCapabilityConfig
} = await import('~~/server/lib/api-capabilities/config-service')

let client: PGlite

async function insertApi(options: { isOrphaned?: boolean } = {}): Promise<void> {
  await client.query(
    `INSERT INTO apis (
      code,
      path_version,
      capability_config,
      capability_revision,
      is_orphaned,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    ['example', 'v1', {}, 0, options.isOrphaned ?? false, new Date()]
  )
}

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE apis (
      code varchar(50) NOT NULL,
      path_version varchar(8) NOT NULL,
      capability_config jsonb NOT NULL DEFAULT '{}'::jsonb,
      capability_revision integer NOT NULL DEFAULT 0,
      capability_updated_at timestamptz,
      is_orphaned boolean NOT NULL DEFAULT false,
      updated_by integer,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (path_version, code)
    )
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE apis')
  testContext.cache.clear()
  testContext.deletedKeys.length = 0
})

afterAll(async () => {
  await client.close()
})

describe('API capability configuration service', () => {
  it('returns declaration defaults before the first save', async () => {
    await insertApi()

    await expect(loadApiCapabilityConfig('v1', 'example')).resolves.toEqual({
      revision: 0,
      values: { isFeatureEnabled: true, serviceCookie: '' },
      isConfigured: false,
      updatedAt: null
    })
  })

  it('persists values and invalidates the shared cache', async () => {
    await insertApi()
    await loadApiCapabilityConfig('v1', 'example')

    const saved = await saveApiCapabilityConfig(
      'v1',
      'example',
      0,
      { isFeatureEnabled: false, serviceCookie: 'session=secret' },
      7
    )

    expect(saved).toMatchObject({
      revision: 1,
      values: { isFeatureEnabled: false, serviceCookie: 'session=secret' },
      isConfigured: true
    })
    expect(saved.updatedAt).toEqual(expect.any(String))
    expect(testContext.deletedKeys).toEqual(['cache:api-capability:v1:example'])
    const storedRows = await client.query<{ capability_config: Record<string, unknown> }>(
      'SELECT capability_config FROM apis WHERE path_version = $1 AND code = $2',
      ['v1', 'example']
    )
    expect(storedRows.rows[0]?.capability_config.serviceCookie).toMatch(/^enc:v1:/)
    await expect(loadApiCapabilityConfig('v1', 'example')).resolves.toMatchObject({
      revision: 1,
      values: { isFeatureEnabled: false, serviceCookie: 'session=secret' },
      isConfigured: true
    })
  })

  it('masks secrets for admins and preserves them when the submitted value is blank', async () => {
    await insertApi()
    const first = await saveApiCapabilityConfig(
      'v1',
      'example',
      0,
      { isFeatureEnabled: true, serviceCookie: 'session=secret' },
      1
    )
    expect(maskApiCapabilitySecrets(definition, first)).toMatchObject({
      values: { isFeatureEnabled: true, serviceCookie: '' },
      configuredSecretKeys: ['serviceCookie']
    })

    await saveApiCapabilityConfig(
      'v1',
      'example',
      1,
      { isFeatureEnabled: false, serviceCookie: '' },
      1
    )
    await expect(loadApiCapabilityConfig('v1', 'example')).resolves.toMatchObject({
      values: { isFeatureEnabled: false, serviceCookie: 'session=secret' }
    })
  })

  it('allows only one writer for the same revision', async () => {
    await insertApi()

    const results = await Promise.allSettled([
      saveApiCapabilityConfig('v1', 'example', 0, { isFeatureEnabled: false, serviceCookie: '' }, 1),
      saveApiCapabilityConfig('v1', 'example', 0, { isFeatureEnabled: true, serviceCookie: '' }, 2)
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected')
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: {
        statusCode: 409,
        errorCode: 'API_CAPABILITY_CONFIG_CONFLICT'
      }
    })
  })

  it('rejects missing and orphaned APIs', async () => {
    await expect(saveApiCapabilityConfig(
      'v1',
      'example',
      0,
      { isFeatureEnabled: false, serviceCookie: '' },
      1
    )).rejects.toMatchObject({ errorCode: 'API_NOT_REGISTERED' })

    await insertApi({ isOrphaned: true })
    await expect(saveApiCapabilityConfig(
      'v1',
      'example',
      0,
      { isFeatureEnabled: false, serviceCookie: '' },
      1
    )).rejects.toMatchObject({ errorCode: 'API_ORPHANED' })
  })
})
