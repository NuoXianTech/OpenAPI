import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ServiceControlRequestError,
  UnsupportedServiceProtocolError
} from '~~/server/utils/service-control-client'
import {
  buildServiceControlUrl,
  serviceControlClient
} from '~~/server/utils/service-control-client'

// Keep protocol parsing tests deterministic while the production client uses
// the DNS-pinned safe transport.
vi.mock('~~/server/utils/safe-fetch', () => ({
  readLimitedText: async (response: Response, maxBytes: number) => {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error('upstream response is too large')
    }
    return text
  },
  safeFetch: (input: RequestInfo | URL, init?: RequestInit) => (
    globalThis.fetch(input, init)
  )
}))

function description(serviceProtocol: string) {
  return {
    schemaVersion: 1,
    serviceId: 'test-service',
    name: 'Test Service',
    version: '9.7.3',
    commit: 'test-commit',
    openapi: '/openapi.json',
    openapiSha256: 'a'.repeat(64),
    health: '/healthz',
    readiness: '/readyz',
    configuration: {
      schema: '/.well-known/configuration-schema.json',
      state: '/.well-known/configuration.json',
      update: '/.well-known/configuration.json',
      schemaSha256: 'b'.repeat(64)
    },
    serviceProtocol
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Service control client', () => {
  it('keeps control endpoints under the configured Service base path', () => {
    expect(buildServiceControlUrl(
      'http://service.example.test/control',
      '/.well-known/service.json'
    ).toString()).toBe(
      'http://service.example.test/control/.well-known/service.json'
    )
    expect(() => buildServiceControlUrl(
      'http://service.example.test/control',
      '/../admin'
    )).toThrow(/dot segments/)
    expect(() => buildServiceControlUrl(
      'http://service.example.test/control',
      '/%2f..%2fadmin'
    )).toThrow(/dot segments/)
    expect(() => buildServiceControlUrl(
      'http://service.example.test/control',
      'https://evil.example.test/admin'
    )).toThrow(/absolute path/)
  })

  it('accepts supported protocols independently of the Service release version', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify(description('openapi-service/v1')),
      { status: 200 }
    )))

    await expect(serviceControlClient.getDescription(
      'http://127.0.0.1:8080',
      'service-token-that-is-at-least-32-characters'
    )).resolves.toMatchObject({
      data: {
        serviceProtocol: 'openapi-service/v1',
        version: '9.7.3'
      }
    })
  })

  it('rejects unsupported Service protocols before parsing their versioned body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({
        serviceProtocol: 'openapi-service/v2',
        incompatibleBody: true
      }),
      { status: 200 }
    )))

    await expect(serviceControlClient.getDescription(
      'http://127.0.0.1:8080',
      'service-token-that-is-at-least-32-characters'
    )).rejects.toMatchObject({
      name: 'UnsupportedServiceProtocolError',
      serviceProtocol: 'openapi-service/v2',
      supportedProtocols: ['openapi-service/v1']
    } satisfies Partial<UnsupportedServiceProtocolError>)
  })

  it('preserves bounded structured Service errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      code: 'CONFIGURATION_REVISION_CONFLICT',
      message: '服务配置版本冲突',
      data: { currentRevision: 7 },
      timestamp: Date.now()
    }), {
      status: 409,
      headers: {
        'content-type': 'application/json',
        'x-openapi-error-code': 'CONFIGURATION_REVISION_CONFLICT'
      }
    })))

    const request = serviceControlClient.updateConfiguration(
      'http://127.0.0.1:8080',
      '/.well-known/configuration.json',
      'service-token-that-is-at-least-32-characters',
      { revision: 8, values: {} }
    )

    await expect(request).rejects.toMatchObject({
      name: 'ServiceControlRequestError',
      status: 409,
      endpoint: '/.well-known/configuration.json',
      message: expect.stringContaining(
        '[CONFIGURATION_REVISION_CONFLICT] 服务配置版本冲突'
      )
    } satisfies Partial<ServiceControlRequestError>)
  })
})
