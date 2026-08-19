import { describe, expect, it } from 'vitest'
import type {
  PlatformProduct,
  PlatformRouteBinding,
  PlatformUpstream
} from '#shared/types/platform'
import {
  createRouteFormState,
  routeMutationPayload,
  routeUpstreamOptions,
  routeVersionOptions
} from '~/utils/platform-route-form'

const current = {
  route: {
    id: 'route-1',
    apiVersionId: 'version-old',
    name: 'Existing route',
    hosts: ['api.example.com'],
    method: 'GET',
    pathPattern: '/v1/existing',
    normalizedShape: '/v1/existing',
    upstreamServiceId: 'upstream-old',
    upstreamPathTemplate: '/v1/existing',
    isApiKey: true,
    isStatistics: true,
    creditsCost: 2,
    rateLimitPerSecond: 1,
    rateLimitPerMinute: 10,
    rateLimitPerHour: 100,
    rateLimitPerDay: 1000,
    timeoutMs: 5000,
    maxRequestBytes: 2048,
    maxResponseBytes: 4096,
    catalogStatus: 'automatic',
    sensitiveQueryParameters: ['token'],
    managedBy: 'manual',
    isSupportRoute: false,
    state: 'active',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z'
  },
  version: {
    id: 'version-old',
    productId: 'product-old',
    version: 'v1',
    state: 'retired',
    changelog: '',
    createdAt: '2026-08-19T00:00:00.000Z',
    publishedAt: null,
    deprecatedAt: null,
    retiredAt: '2026-08-19T00:00:00.000Z'
  },
  product: {
    id: 'product-old',
    workspaceId: 'workspace-1',
    slug: 'old-product',
    name: 'Old Product',
    lifecycle: 'retired'
  },
  upstream: {
    id: 'upstream-old',
    workspaceId: 'workspace-1',
    slug: 'old-upstream',
    name: 'Old Upstream',
    kind: 'external',
    protocol: 'https',
    status: 'disabled'
  }
} as unknown as PlatformRouteBinding

describe('Platform route form', () => {
  it('preserves retired versions and disabled upstreams while editing', () => {
    const products = [{
      id: 'product-new',
      workspaceId: 'workspace-1',
      slug: 'new-product',
      name: 'New Product',
      lifecycle: 'active',
      versions: [{ id: 'version-new', version: 'v2', state: 'published' }]
    }] as unknown as PlatformProduct[]
    const upstreams = [{
      id: 'upstream-new',
      workspaceId: 'workspace-1',
      name: 'New Upstream',
      kind: 'external',
      protocol: 'https',
      status: 'active'
    }] as unknown as PlatformUpstream[]

    expect(routeVersionOptions(products, 'workspace-1', current))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ value: 'version-old' }),
        expect.objectContaining({ value: 'version-new' })
      ]))
    expect(routeUpstreamOptions(upstreams, 'workspace-1', current))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ value: 'upstream-old' }),
        expect.objectContaining({ value: 'upstream-new' })
      ]))
  })

  it('maps stored values to form units and a normalized mutation payload', () => {
    const state = createRouteFormState(current)
    state.name = '  Updated route  '
    state.hostsText = 'api.example.com, api.example.com\nwww.example.com'
    state.sensitiveQueryParameters = [' token ', 'token', '']

    expect(state).toMatchObject({
      apiVersionId: 'version-old',
      upstreamServiceId: 'upstream-old',
      maxRequestKiB: 2,
      maxResponseKiB: 4
    })
    expect(routeMutationPayload(state)).toMatchObject({
      name: 'Updated route',
      hosts: ['api.example.com', 'www.example.com'],
      maxRequestBytes: 2048,
      maxResponseBytes: 4096,
      sensitiveQueryParameters: ['token']
    })
  })
})
