import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const manifestMocks = vi.hoisted(() => ({
  getAllowedMethods: vi.fn<(pathVersion: string, code: string, pathname: string) => string[]>(),
  matchEndpoint: vi.fn()
}))

vi.mock('~~/server/utils/api-manifest', () => manifestMocks)
vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)

const { default: handleOpenApiRouting } = await import('~~/server/middleware/00.10-open-api-routing')

interface MockEventResult {
  event: H3Event
  headers: Map<string, string>
}

function createMockEvent(path: string, method = 'GET'): MockEventResult {
  const headers = new Map<string, string>()
  const event = {
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
        setHeader(name: string, value: string) {
          headers.set(name.toLowerCase(), String(value))
        },
        getHeader(name: string) {
          return headers.get(name.toLowerCase())
        }
      }
    }
  } as unknown as H3Event

  return { event, headers }
}

beforeEach(() => {
  vi.clearAllMocks()
  manifestMocks.matchEndpoint.mockReturnValue(null)
  manifestMocks.getAllowedMethods.mockReturnValue([])
})

describe('open API routing middleware', () => {
  it('returns 405 before a GET request reaches the Vue page router', () => {
    manifestMocks.getAllowedMethods.mockReturnValue(['POST'])
    const { event, headers } = createMockEvent('/v1/password/check')

    const result = handleOpenApiRouting(event)

    expect(event.node.res.statusCode).toBe(405)
    expect(headers.get('allow')).toBe('POST')
    expect(headers.get('cache-control')).toBe('no-store')
    expect(result).toMatchObject({
      code: 'METHOD_NOT_ALLOWED',
      message: '请求方法不受支持',
      data: null
    })
  })

  it('lets a matching endpoint continue to its Nitro route handler', () => {
    manifestMocks.matchEndpoint.mockReturnValue({ endpoint: {}, params: {} })
    const { event } = createMockEvent('/v1/password')

    expect(handleOpenApiRouting(event)).toBeUndefined()
    expect(event.node.res.statusCode).toBe(200)
    expect(manifestMocks.getAllowedMethods).not.toHaveBeenCalled()
  })

  it('returns the public API 404 contract for an unknown versioned path', () => {
    const { event, headers } = createMockEvent('/v1/not-found')

    const result = handleOpenApiRouting(event)

    expect(event.node.res.statusCode).toBe(404)
    expect(headers.get('cache-control')).toBe('no-store')
    expect(result).toMatchObject({
      code: 'API_NOT_FOUND',
      message: '接口不存在',
      data: null
    })
  })
})
