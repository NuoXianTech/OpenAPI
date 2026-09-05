import { describe, expect, it } from 'vitest'
import type { ServiceDescription } from '#shared/types/service-control'
import { selectCompatibleTargets } from '~~/server/services/platform-service-discovery-service'

function description(contract: string): ServiceDescription {
  return {
    schemaVersion: 1,
    serviceId: 'openapi-service',
    name: 'OpenAPI Service',
    version: contract,
    commit: contract,
    openapi: '/openapi.json',
    openapiSha256: contract.repeat(64).slice(0, 64),
    health: '/healthz',
    readiness: '/readyz',
    configuration: {
      schema: '/.well-known/configuration-schema.json',
      state: '/.well-known/configuration.json',
      update: '/.well-known/configuration.json',
      schemaSha256: contract.repeat(64).slice(0, 64)
    },
    serviceProtocol: 'openapi-service/v1'
  }
}

describe('Service discovery contract selection', () => {
  it('keeps the currently published contract while one compatible Target remains', () => {
    const current = description('a')
    const replacement = description('b')
    const errors = new Map<string, string>()

    const result = selectCompatibleTargets([
      { targetId: 'new-2', description: replacement },
      { targetId: 'old-1', description: current },
      { targetId: 'new-1', description: replacement }
    ], errors, current)

    expect(result.targets.map(target => target.targetId)).toEqual(['old-1'])
    expect([...errors.keys()]).toEqual(
      expect.arrayContaining(['new-1', 'new-2'])
    )
  })

  it('selects the largest deterministic contract cohort on first discovery', () => {
    const smaller = description('a')
    const larger = description('b')
    const result = selectCompatibleTargets([
      { targetId: 'small', description: smaller },
      { targetId: 'large-2', description: larger },
      { targetId: 'large-1', description: larger }
    ], new Map(), null)

    expect(result.targets.map(target => target.targetId)).toEqual([
      'large-1',
      'large-2'
    ])
  })
})
