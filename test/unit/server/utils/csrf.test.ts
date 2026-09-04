import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { assertSameOriginMutation } from '~~/server/utils/csrf'

function event(
  headers: Record<string, string> = {},
  method = 'POST'
): H3Event {
  return {
    method,
    path: '/api/user/profile',
    node: {
      req: {
        url: '/api/user/profile',
        originalUrl: '/api/user/profile',
        headers: { host: 'platform.example', ...headers },
        connection: { encrypted: true }
      },
      res: {}
    }
  } as unknown as H3Event
}

describe('same-origin mutation guard', () => {
  it('allows same-origin and non-browser requests', () => {
    expect(() => assertSameOriginMutation(event({
      origin: 'https://platform.example'
    }))).not.toThrow()
    expect(() => assertSameOriginMutation(event())).not.toThrow()
  })

  it('rejects cross-origin browser mutations', () => {
    expect(() => assertSameOriginMutation(event({
      origin: 'https://attacker.example'
    }))).toThrowError(expect.objectContaining({
      statusCode: 403,
      data: { code: 'CSRF_ORIGIN_MISMATCH' }
    }))
    expect(() => assertSameOriginMutation(event({
      'sec-fetch-site': 'cross-site'
    }))).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it('checks the referer when Origin is absent', () => {
    expect(() => assertSameOriginMutation(event({
      referer: 'https://attacker.example/form'
    }))).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it('does not affect safe methods', () => {
    expect(() => assertSameOriginMutation(event({
      origin: 'https://attacker.example'
    }, 'GET'))).not.toThrow()
  })
})
