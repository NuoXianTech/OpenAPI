import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))
vi.stubGlobal('useRuntimeConfig', () => ({
  apiKeySecret: '0123456789abcdef0123456789abcdef'
}))

const { platformUpstreamService } = await import(
  '~~/server/services/platform-upstream-service'
)
const { platformWorkspaceService } = await import(
  '~~/server/services/platform-workspace-service'
)

let client: PGlite
let database: ReturnType<typeof drizzle<typeof schema>>
let workspaceId: string

beforeAll(async () => {
  client = new PGlite()
  database = drizzle(client, { schema })
  testContext.database = database
  await migrate(database, {
    migrationsFolder: resolve(
      process.cwd(),
      'server/db/migrations/postgresql'
    ),
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations'
  })
})

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE workspaces CASCADE;')
  workspaceId = (await platformWorkspaceService.ensureDefault()).workspace.id
})

afterAll(async () => client.close())

async function createConfiguredTarget() {
  const upstream = await platformUpstreamService.create({
    workspaceId,
    slug: 'service-target-state',
    name: 'Service Target State',
    kind: 'internal',
    serviceToken: 'openapi-test-service-token-with-at-least-32-characters',
    loadBalancing: 'round_robin',
    targets: [{ baseUrl: 'http://127.0.0.1:8080', weight: 1 }]
  })
  const target = upstream.targets[0]!
  const configured = (await database.update(schema.upstreamTargets).set({
    configurationRevision: 3,
    configurationHash: 'a'.repeat(64),
    configurationStatus: 'synced',
    configurationState: {
      schemaVersion: 1,
      serviceId: 'openapi-service',
      schemaSha256: 'b'.repeat(64),
      revision: 3,
      configurationSha256: 'a'.repeat(64),
      values: {},
      updatedAt: new Date().toISOString()
    },
    lastConfigurationSyncAt: new Date(),
    lastError: 'stale error'
  }).where(eq(schema.upstreamTargets.id, target.id)).returning())[0]!
  return configured
}

describe('Platform upstream target state', () => {
  it('resets Service state when a Target address changes', async () => {
    const target = await createConfiguredTarget()
    const updated = await platformUpstreamService.updateTarget(target.id, {
      baseUrl: 'http://127.0.0.1:8081'
    })

    expect(updated.target).toMatchObject({
      baseUrl: 'http://127.0.0.1:8081/',
      configurationRevision: null,
      configurationHash: null,
      configurationStatus: 'unknown',
      configurationState: null,
      lastConfigurationSyncAt: null,
      lastError: null
    })
  })

  it('resets Service state when a disabled Target is enabled again', async () => {
    const target = await createConfiguredTarget()
    await platformUpstreamService.updateTarget(target.id, { enabled: false })
    const updated = await platformUpstreamService.updateTarget(target.id, {
      enabled: true
    })

    expect(updated.target).toMatchObject({
      enabled: true,
      configurationRevision: null,
      configurationHash: null,
      configurationStatus: 'unknown',
      configurationState: null,
      lastConfigurationSyncAt: null,
      lastError: null
    })
  })
})
