import { describe, expect, it } from 'vitest'
import type { ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import {
  buildGatewayTargetUrl,
  orderedGatewayTargets
} from '~~/server/services/dynamic-gateway-target-service'

function match(
  id: string,
  loadBalancing: 'round_robin' | 'weighted',
  weights: number[]
): ResolvedDynamicRoute {
  return {
    upstream: {
      id,
      kind: 'internal',
      loadBalancing,
      targets: weights.map((weight, index) => ({
        id: `${id}-${index}`,
        baseUrl: `http://127.0.0.1:808${index}`,
        weight
      }))
    }
  } as ResolvedDynamicRoute
}

describe('dynamic gateway target selection', () => {
  it('rotates round-robin targets for each request', () => {
    const route = match('round-robin-test', 'round_robin', [1, 1, 1])

    expect(Array.from({ length: 4 }, () => (
      orderedGatewayTargets(route)[0]?.id
    ))).toEqual([
      'round-robin-test-0',
      'round-robin-test-1',
      'round-robin-test-2',
      'round-robin-test-0'
    ])
  })

  it('uses deterministic weighted rotation without random imbalance', () => {
    const route = match('weighted-test', 'weighted', [3, 1])

    expect(Array.from({ length: 8 }, () => (
      orderedGatewayTargets(route)[0]?.id
    ))).toEqual([
      'weighted-test-0',
      'weighted-test-0',
      'weighted-test-0',
      'weighted-test-1',
      'weighted-test-0',
      'weighted-test-0',
      'weighted-test-0',
      'weighted-test-1'
    ])
  })

  it('keeps public query parameters but strips the API key upstream', () => {
    expect(buildGatewayTargetUrl(
      'http://127.0.0.1:8080/base/',
      '/v1/player',
      '?apikey=secret&id=42'
    ).toString()).toBe('http://127.0.0.1:8080/base/v1/player?id=42')
  })
})
