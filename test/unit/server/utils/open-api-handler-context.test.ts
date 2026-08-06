import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler)

const { createOpenApiHandlerContext } = await import('~~/server/utils/open-api-handler-context')

function createEvent(): { event: H3Event, headers: Map<string, string> } {
  const headers = new Map<string, string>()
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), String(value))
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase())
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase())
    },
    writeHead(statusCode: number, responseHeaders?: Record<string, string>) {
      response.statusCode = statusCode
      for (const [name, value] of Object.entries(responseHeaders || {})) {
        headers.set(name.toLowerCase(), String(value))
      }
    },
    end() {}
  }
  const event = {
    path: '/v1/demo/42?format=text',
    method: 'GET',
    context: {
      params: { id: '42' },
      clientIp: '198.51.100.10',
      apiKey: { id: 7, userId: 11, name: 'public-key' },
      apiBilling: {
        costCredits: 1,
        apiKeyUserId: 11,
        apiKeyQuotaReservation: null,
        forcedOutcome: null,
        failedCode: null,
        failedMessage: null
      }
    },
    node: {
      req: {
        url: '/v1/demo/42?format=text',
        originalUrl: '/v1/demo/42?format=text',
        method: 'GET',
        headers: {
          'host': 'localhost',
          'x-request-id': '550e8400-e29b-41d4-a716-446655440000',
          'x-forwarded-for': '198.51.100.10'
        },
        socket: { remoteAddress: '127.0.0.1' }
      },
      res: response
    }
  } as unknown as H3Event

  return { event, headers }
}

describe('open API handler context', () => {
  let event: H3Event
  let headers: Map<string, string>
  const signal = new AbortController().signal

  beforeEach(() => {
    ({ event, headers } = createEvent())
  })

  it('exposes normalized request data and caller metadata', () => {
    const context = createOpenApiHandlerContext(event, signal)

    expect(context.signal).toBe(signal)
    expect(context.url.pathname).toBe('/v1/demo/42')
    expect(context.header('x-request-id')).toBe('550e8400-e29b-41d4-a716-446655440000')
    context.setHeaders({ 'cache-control': 'no-store' })
    expect(headers.get('cache-control')).toBe('no-store')
    expect(context.query.format).toBe('text')
    expect(context.params).toEqual({ id: '42' })
    expect(context.clientIp).toBe('127.0.0.1')
    expect(context.apiKey).toEqual({ id: 7, userId: 11, name: 'public-key' })
    expect(context.requestId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('returns standard responses and marks business failures', () => {
    const context = createOpenApiHandlerContext(event, signal)

    expect(context.ok({ ready: true }, 'ready')).toMatchObject({
      code: 'OK',
      message: 'ready',
      data: { ready: true }
    })
    expect(event.node.res.statusCode).toBe(200)
    expect(headers.get('x-request-id')).toBe('550e8400-e29b-41d4-a716-446655440000')

    expect(context.businessFail(422, 'INVALID_DEMO', 'invalid')).toMatchObject({
      code: 'INVALID_DEMO',
      message: 'invalid',
      data: null
    })
    expect(event.context.apiBilling?.forcedOutcome).toBe('failed')
    expect(event.context.apiBilling?.failedCode).toBe('INVALID_DEMO')
  })

  it('negotiates standard JSON, text, and markdown responses', () => {
    event.path = '/v1/demo/42?encode=text'
    event.node.req.url = '/v1/demo/42?encode=text'
    event.node.req.originalUrl = '/v1/demo/42?encode=text'
    let context = createOpenApiHandlerContext(event, signal)

    expect(context.respond({ value: 7 }, {
      text: data => `value=${data.value}`,
      markdown: data => `**${data.value}**`
    })).toBe('value=7')
    expect(headers.get('content-type')).toBe('text/plain; charset=utf-8')

    event.path = '/v1/demo/42?encoding=md'
    event.node.req.url = '/v1/demo/42?encoding=md'
    event.node.req.originalUrl = '/v1/demo/42?encoding=md'
    context = createOpenApiHandlerContext(event, signal)
    expect(context.respond({ value: 8 }, {
      text: data => `value=${data.value}`,
      markdown: data => `**${data.value}**`
    })).toBe('**8**')
    expect(headers.get('content-type')).toBe('text/markdown; charset=utf-8')
  })

  it('exposes bounded request body reading', async () => {
    const context = createOpenApiHandlerContext(event, signal)
    await expect(context.readBody()).resolves.toBeUndefined()
  })

  it('writes raw and redirect responses with request tracing', () => {
    const context = createOpenApiHandlerContext(event, signal)

    expect(context.raw('hello', {
      contentType: 'text/plain; charset=utf-8',
      headers: { 'cache-control': 'no-store' }
    })).toBe('hello')
    expect(event.node.res.statusCode).toBe(200)
    expect(headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(headers.get('cache-control')).toBe('no-store')

    context.redirect('https://example.com/image.png')
    expect(event.node.res.statusCode).toBe(302)
    expect(headers.get('location')).toBe('https://example.com/image.png')
    expect(headers.get('x-request-id')).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})
