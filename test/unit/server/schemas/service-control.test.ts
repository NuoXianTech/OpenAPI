import { describe, expect, it } from 'vitest'
import { adminCreateUpstreamSchema } from '~~/server/schemas/admin'
import { adminUpdateServiceTokenSchema } from '~~/server/schemas/service-control'

const token = 't'.repeat(32)

describe('Service control schemas', () => {
  it('normalizes Service Tokens at Platform boundaries', () => {
    expect(adminUpdateServiceTokenSchema.parse({
      serviceToken: `  ${token}  `
    }).serviceToken).toBe(token)

    expect(adminCreateUpstreamSchema.parse({
      workspaceId: 'd11cb56d-8c0b-45fb-8827-768a21472b7b',
      slug: 'schema-test-service',
      name: 'Schema Test Service',
      kind: 'internal',
      serviceToken: `  ${token}  `,
      loadBalancing: 'round_robin',
      targets: [{ baseUrl: 'http://127.0.0.1:8080', weight: 1 }]
    }).serviceToken).toBe(token)
  })
})
