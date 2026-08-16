import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceControlRequestError } from '~~/server/utils/service-control-client'
import { serviceControlClient } from '~~/server/utils/service-control-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Service control client', () => {
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
