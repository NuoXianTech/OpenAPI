import { describe, expect, it } from 'vitest'
import { serviceConfigurationDefinitionSchema } from '#shared/service-control'
import {
  adminCreateUpstreamSchema,
  adminUpdateServiceTokenSchema
} from '~~/server/schemas/admin'

const token = 't'.repeat(32)

describe('Service control schemas', () => {
  it('rejects definitions outside the Service control bounds', () => {
    expect(serviceConfigurationDefinitionSchema.safeParse({
      schemaVersion: 1,
      groups: [{ key: 'source', label: 'x'.repeat(301), fields: [] }]
    }).success).toBe(false)
  })

  it('normalizes Service Tokens at Platform boundaries', () => {
    expect(adminUpdateServiceTokenSchema.parse({
      serviceToken: `  ${token}  `
    }).serviceToken).toBe(token)

    expect(adminCreateUpstreamSchema.parse({
      slug: 'schema-test-service',
      name: 'Schema Test Service',
      serviceToken: `  ${token}  `,
      loadBalancing: 'round_robin',
      targets: [{ baseUrl: 'http://127.0.0.1:8080', weight: 1 }]
    }).serviceToken).toBe(token)
  })
})
