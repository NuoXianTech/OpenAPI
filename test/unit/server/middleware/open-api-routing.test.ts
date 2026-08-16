import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dynamicGatewayMocks = vi.hoisted(() => ({
  tryHandle: vi.fn()
}))

vi.mock('~~/server/services/dynamic-gateway-service', () => ({
  dynamicGatewayService: dynamicGatewayMocks
}))
vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)

const { default: handleOpenApiRouting } = await import('~~/server/middleware/01-open-api-routing')

function createMockEvent(path: string, method = 'GET'): H3Event {
  return {
    path,
    method,
    context: {},
    node: {
      req: {
        url: path,
        originalUrl: path,
        method,
        headers: { host: 'localhost' }
      },
      res: {
        statusCode: 200,
        setHeader() {},
        getHeader() {},
        removeHeader() {},
        writeHead() {},
        end() {}
      }
    }
  } as unknown as H3Event
}

beforeEach(() => {
  vi.clearAllMocks()
  dynamicGatewayMocks.tryHandle.mockResolvedValue({ matched: false })
})

describe('dynamic API routing middleware', () => {
  it('returns the response produced by the dynamic Gateway', async () => {
    const response = { proxied: true }
    dynamicGatewayMocks.tryHandle.mockResolvedValue({ matched: true, response })
    const event = createMockEvent('/v1/proxy-smoke')

    await expect(handleOpenApiRouting(event)).resolves.toBe(response)
  })

  it('lets Nuxt continue when no published Route matches', async () => {
    const event = createMockEvent('/v1/not-found')

    await expect(handleOpenApiRouting(event)).resolves.toBeUndefined()
    expect(dynamicGatewayMocks.tryHandle).toHaveBeenCalledOnce()
  })

  it('never sends Platform control-plane paths to the dynamic Gateway', async () => {
    const event = createMockEvent('/api/admin/v1/routes')

    await expect(handleOpenApiRouting(event)).resolves.toBeUndefined()
    expect(dynamicGatewayMocks.tryHandle).not.toHaveBeenCalled()
  })
})
