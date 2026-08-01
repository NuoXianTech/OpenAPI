import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  normalizeClientIp,
  readClientIp,
  toClientIpRateLimitValue
} from '~~/server/utils/request-meta'

function createEvent(contextIp?: string, socketIp?: string): H3Event {
  return {
    context: contextIp ? { clientAddress: contextIp } : {},
    node: {
      req: {
        socket: { remoteAddress: socketIp }
      }
    }
  } as unknown as H3Event
}

describe('request IP metadata', () => {
  it('normalizes valid client addresses', () => {
    expect(normalizeClientIp(' 127.0.0.1 ')).toBe('127.0.0.1')
    expect(normalizeClientIp('::ffff:127.0.0.1')).toBe('127.0.0.1')
    expect(normalizeClientIp('::FFFF:192.0.2.10')).toBe('192.0.2.10')
    expect(normalizeClientIp('2001:db8::1')).toBe('2001:db8::1')
    expect(normalizeClientIp('[2001:db8::1]:443')).toBe('2001:db8::1')
    expect(normalizeClientIp('fe80::1%12')).toBe('fe80::1')
    expect(normalizeClientIp('192.0.2.10:8443')).toBe('192.0.2.10')
  })

  it('treats unspecified and invalid addresses as unknown', () => {
    expect(normalizeClientIp('0.0.0.0')).toBeNull()
    expect(normalizeClientIp('::')).toBeNull()
    expect(normalizeClientIp('not-an-ip')).toBeNull()
    expect(normalizeClientIp(null)).toBeNull()
  })

  it('reads context first and falls back to the socket address', () => {
    expect(readClientIp(createEvent('::ffff:192.0.2.10', '127.0.0.1'))).toBe('192.0.2.10')
    expect(readClientIp(createEvent(undefined, '::ffff:127.0.0.1'))).toBe('127.0.0.1')
    expect(readClientIp(createEvent(undefined, '0.0.0.0'))).toBeNull()
  })

  it('keeps unknown clients in a shared non-persistent rate-limit bucket', () => {
    expect(toClientIpRateLimitValue(null)).toBe('unknown')
    expect(toClientIpRateLimitValue('127.0.0.1')).toBe('127.0.0.1')
  })
})
