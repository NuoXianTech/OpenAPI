import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedDynamicRoute } from '~~/server/services/routing-runtime-service'
import {
  buildGatewayTargetUrl,
  createGatewayProxyFetch,
  orderedGatewayTargets
} from '~~/server/services/dynamic-gateway-target-service'

vi.mock('~~/server/utils/safe-fetch', () => ({
  safeFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)
}))

function match(
  id: string,
  loadBalancing: 'round_robin' | 'weighted',
  weights: number[]
): ResolvedDynamicRoute {
  return {
    upstream: {
      id,
      serviceManaged: true,
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })
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

  it('converts only explicit Service Token rejection into a gateway error', async () => {
    const route = match('service-auth-test', 'round_robin', [1])
    const request = vi.fn().mockResolvedValue(new Response(null, {
      status: 401,
      headers: {
        'x-openapi-error-code': 'UNAUTHORIZED',
        'www-authenticate': 'Service realm="openapi-service"'
      }
    }))
    vi.stubGlobal('fetch', request)
    const proxyFetch = createGatewayProxyFetch({
      match: route,
      targets: route.upstream.targets,
      upstreamPath: '/v1/player',
      search: '',
      maximumResponseBytes: 1024,
      onTarget: vi.fn(),
      onResponseBytes: vi.fn()
    })

    await expect(proxyFetch(new Request('http://gateway.invalid'), {
      headers: { authorization: 'Service wrong-token' }
    })).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_AUTH_FAILED',
      publicMessage: '上游服务认证失败'
    })
  })

  it('preserves an internal business endpoint 401 response', async () => {
    const route = match('business-auth-test', 'round_robin', [1])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ code: 'UNAUTHORIZED' }),
      {
        status: 401,
        headers: {
          'content-type': 'application/json',
          'x-openapi-error-code': 'UNAUTHORIZED'
        }
      }
    )))
    const proxyFetch = createGatewayProxyFetch({
      match: route,
      targets: route.upstream.targets,
      upstreamPath: '/v1/private',
      search: '',
      maximumResponseBytes: 1024,
      onTarget: vi.fn(),
      onResponseBytes: vi.fn()
    })

    const response = await proxyFetch(new Request('http://gateway.invalid'))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: 'UNAUTHORIZED' })
  })
})
