import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceDescription } from '#shared/types/service-control'
import * as schema from '~~/server/db/schema'
import { canonicalJson } from '~~/server/utils/canonical-json'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))
vi.stubGlobal('useRuntimeConfig', () => ({
  apiKeySecret: '0123456789abcdef0123456789abcdef'
}))

const { persistServiceOpenApi } = await import(
  '~~/server/services/platform-service-openapi-service'
)
const { platformUpstreamService } = await import(
  '~~/server/services/platform-upstream-service'
)
let client: PGlite
let database: ReturnType<typeof drizzle<typeof schema>>

beforeAll(async () => {
  client = new PGlite()
  database = drizzle(client, { schema })
  testContext.database = database
  await migrate(database, {
    migrationsFolder: resolve(process.cwd(), 'server/db/migrations/postgresql'),
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations'
  })
})

beforeEach(async () => {
  await client.exec(
    'TRUNCATE TABLE upstream_services, openapi_documents CASCADE;'
  )
})

afterAll(async () => client.close())

async function createUpstream(slug: string) {
  return platformUpstreamService.create({
    slug,
    name: slug,
    serviceToken: 'openapi-test-service-token-with-at-least-32-characters',
    loadBalancing: 'round_robin',
    targets: [{ baseUrl: 'http://127.0.0.1:8080', weight: 1 }]
  })
}

function contract(serviceId: string) {
  const document = {
    openapi: '3.1.0',
    info: { title: 'Test Service', version: '0.1.0' },
    paths: {
      '/v1/test': {
        get: {
          operationId: 'getTest',
          summary: 'Test endpoint',
          tags: ['Test']
        }
      }
    }
  }
  const openapiSha256 = createHash('sha256')
    .update(canonicalJson(document))
    .digest('hex')
  const description: ServiceDescription = {
    schemaVersion: 1,
    serviceId,
    name: 'Test Service',
    version: '0.1.0',
    commit: 'test',
    serviceProtocol: 'openapi-service/v1',
    openapi: '/openapi.json',
    openapiSha256,
    health: '/healthz',
    readiness: '/readyz',
    configuration: {
      schema: '/.well-known/configuration-schema.json',
      state: '/.well-known/configuration.json',
      update: '/.well-known/configuration',
      schemaSha256: '1'.repeat(64)
    }
  }
  return { description, document, openapiSha256 }
}

describe('Service OpenAPI persistence', () => {
  it('deduplicates concurrent discovery for the same upstream provenance', async () => {
    const upstream = await createUpstream('concurrent-service')
    const { description, document, openapiSha256 } = contract('concurrent-service')
    const input = {
      upstreamServiceId: upstream.id,
      description,
      document,
      reportedSha256: openapiSha256,
      sourceUrl: 'http://127.0.0.1:8080/openapi.json'
    }

    const persisted = await Promise.all([
      persistServiceOpenApi(input),
      persistServiceOpenApi(input),
      persistServiceOpenApi(input)
    ])
    const documents = await database.select().from(schema.openapiDocuments)
      .where(eq(schema.openapiDocuments.upstreamServiceId, upstream.id))
    const [service] = await database.select().from(schema.upstreamServices)
      .where(eq(schema.upstreamServices.id, upstream.id))

    expect(new Set(persisted.map(item => item.id))).toEqual(
      new Set([documents[0]?.id])
    )
    expect(documents).toHaveLength(1)
    expect(documents[0]?.parsedSummary).toMatchObject({ endpointCount: 1 })
    expect(service?.openapiDocumentId).toBe(documents[0]?.id)
  })

  it('keeps identical documents separate across upstreams', async () => {
    const first = await createUpstream('first-service')
    const second = await createUpstream('second-service')
    const { description, document, openapiSha256 } = contract('shared-contract')

    const documents = await Promise.all([first, second].map(upstream => (
      persistServiceOpenApi({
        upstreamServiceId: upstream.id,
        description,
        document,
        reportedSha256: openapiSha256,
        sourceUrl: `${upstream.targets[0]!.baseUrl}openapi.json`
      })
    )))

    expect(documents[0]?.id).not.toBe(documents[1]?.id)
    expect(await database.select().from(schema.openapiDocuments)).toHaveLength(2)
  })
})
