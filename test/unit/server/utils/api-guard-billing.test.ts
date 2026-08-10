import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiKey: {
    id: 7,
    userId: 11,
    name: 'test-key',
    keyDigest: 'digest',
    keyCiphertext: 'ciphertext',
    keyPreview: 'preview',
    isActive: true,
    scopes: null,
    ipWhitelist: null,
    totalQuota: null,
    usedCredits: 0,
    totalCalls: 0,
    lastUsedAt: null,
    lastUsedIp: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  reserve: vi.fn(),
  markReservationPending: vi.fn(),
  releaseReservation: vi.fn()
}))

vi.mock('~~/server/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mocks.apiKey]
        })
      })
    })
  }
}))

vi.mock('~~/server/services/api-registry-service', () => ({
  apiRegistryService: {
    loadGuardConfig: vi.fn(async () => ({
      id: 3,
      code: 'demo',
      pathVersion: 'v1',
      apiPath: '/v1/demo',
      httpMethod: 'GET',
      isEnabled: true,
      isApiKey: true,
      isStatistics: true,
      isOrphaned: false,
      rateLimitPerSecond: 0,
      rateLimitPerMinute: 0,
      rateLimitPerHour: 0,
      rateLimitPerDay: 0,
      methodCosts: { GET: 2 },
      dailyQuota: 0,
      timeoutMs: 10_000
    }))
  }
}))

vi.mock('~~/server/services/credit-service', () => ({
  creditService: {
    reserve: mocks.reserve,
    markReservationPending: mocks.markReservationPending,
    releaseReservation: mocks.releaseReservation
  }
}))

vi.mock('~~/server/utils/api-manifest', () => ({
  getManifestApi: vi.fn(() => ({ pathVersion: 'v1', code: 'demo', endpoints: [] })),
  matchEndpoint: vi.fn(() => ({ endpoint: {}, params: {} })),
  getAllowedMethods: vi.fn(() => ['GET'])
}))

vi.mock('~~/server/utils/stored-secret', () => ({
  digestStoredSecret: vi.fn(() => 'digest')
}))

const { defineOpenApiEventHandler } = await import('~~/server/utils/api-guard')

function createEvent(): H3Event {
  const headers = new Map<string, string>()
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | number) {
      headers.set(name.toLowerCase(), String(value))
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase())
    },
    getHeaders() {
      return Object.fromEntries(headers)
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase())
    }
  }

  return {
    path: '/v1/demo',
    method: 'GET',
    context: { clientIp: '198.51.100.10' },
    node: {
      req: {
        url: '/v1/demo',
        originalUrl: '/v1/demo',
        method: 'GET',
        headers: {
          'host': 'localhost',
          'x-api-key': 'secret-key',
          'x-request-id': '550e8400-e29b-41d4-a716-446655440000'
        },
        socket: { remoteAddress: '198.51.100.10' }
      },
      res: response
    }
  } as unknown as H3Event
}

describe('OpenAPI billing outcome persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.reserve.mockResolvedValue({
      status: 'reserved',
      reservation: { id: 19, userId: 11, amount: 2 }
    })
    mocks.markReservationPending.mockResolvedValue(true)
    mocks.releaseReservation.mockResolvedValue(true)
  })

  it('marks a successful paid call pending before returning its response', async () => {
    const handler = defineOpenApiEventHandler(async () => ({ ok: true }))

    await expect(handler(createEvent())).resolves.toEqual({ ok: true })
    expect(mocks.markReservationPending).toHaveBeenCalledWith(19, 11)
    expect(mocks.releaseReservation).not.toHaveBeenCalled()
  })

  it('returns 503 when a successful billing outcome cannot be persisted', async () => {
    mocks.markReservationPending.mockRejectedValueOnce(new Error('database unavailable'))
    const handler = defineOpenApiEventHandler(async () => ({ ok: true }))
    const event = createEvent()

    await expect(handler(event)).resolves.toMatchObject({ code: 'BILLING_UNAVAILABLE' })
    expect(event.node.res.statusCode).toBe(503)
  })

  it('releases a paid reservation when the handler reports failure', async () => {
    const handler = defineOpenApiEventHandler(async (_event, context) => (
      context.businessFail(422, 'INVALID_DEMO', 'invalid demo')
    ))

    await expect(handler(createEvent())).resolves.toMatchObject({ code: 'INVALID_DEMO' })
    expect(mocks.releaseReservation).toHaveBeenCalledWith(19, 11)
    expect(mocks.markReservationPending).not.toHaveBeenCalled()
  })
})
