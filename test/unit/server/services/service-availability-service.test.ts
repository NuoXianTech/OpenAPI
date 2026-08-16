import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceDescription } from '#shared/types/service-control'
import { resolveServiceAvailability } from '~~/server/services/service-availability-service'

const description: ServiceDescription = {
  schemaVersion: 1,
  serviceId: 'availability-test',
  name: 'Availability test',
  version: '0.1.0',
  commit: 'test',
  openapi: '/openapi.json',
  openapiSha256: 'a'.repeat(64),
  health: '/healthz',
  readiness: '/readyz',
  configuration: {
    schema: '/.well-known/configuration/schema.json',
    state: '/.well-known/configuration/state.json',
    update: '/.well-known/configuration',
    schemaSha256: 'b'.repeat(64)
  },
  platformProtocol: 'openapi-platform-service/v1'
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('service availability service', () => {
  it('returns unknown without a discovered contract or enabled Target', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)

    await expect(resolveServiceAvailability(null, [
      { baseUrl: 'http://127.0.0.1:8100', enabled: true }
    ])).resolves.toBe('unknown')
    await expect(resolveServiceAvailability(description, [
      { baseUrl: 'http://127.0.0.1:8100', enabled: false }
    ])).resolves.toBe('unknown')
    expect(request).not.toHaveBeenCalled()
  })

  it('aggregates readiness across every enabled Target', async () => {
    const request = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input.toString())
      if (url.port === '8202' || url.port === '8302') {
        return new Response(null, { status: 503 })
      }
      if (url.port === '8301') throw new Error('connection refused')
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', request)

    await expect(resolveServiceAvailability(description, [
      { baseUrl: 'http://127.0.0.1:8101', enabled: true },
      { baseUrl: 'http://127.0.0.1:8102', enabled: true }
    ])).resolves.toBe('online')
    await expect(resolveServiceAvailability(description, [
      { baseUrl: 'http://127.0.0.1:8201', enabled: true },
      { baseUrl: 'http://127.0.0.1:8202', enabled: true }
    ])).resolves.toBe('degraded')
    await expect(resolveServiceAvailability(description, [
      { baseUrl: 'http://127.0.0.1:8301', enabled: true },
      { baseUrl: 'http://127.0.0.1:8302', enabled: true }
    ])).resolves.toBe('offline')
  })

  it('deduplicates concurrent Target readiness requests', async () => {
    const request = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', request)
    const targets = [{
      baseUrl: 'http://127.0.0.1:8400/service',
      enabled: true
    }]

    const first = resolveServiceAvailability(description, targets)
    const second = resolveServiceAvailability(description, targets)

    await expect(Promise.all([first, second]))
      .resolves.toEqual(['online', 'online'])

    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]?.[0].toString())
      .toBe('http://127.0.0.1:8400/service/readyz')
  })
})
