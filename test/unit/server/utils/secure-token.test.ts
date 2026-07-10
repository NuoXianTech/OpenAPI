import { describe, expect, it } from 'vitest'
import {
  createHmacSignature,
  decodeBase64Url,
  encodeBase64Url,
  hasValidHmacSignature,
  isTimingSafeEqual
} from '~~/server/utils/secure-token'

describe('secure token utilities', () => {
  it('keeps base64url encoding unpadded and reversible', () => {
    const encoded = encodeBase64Url('OpenAPI 安全令牌')

    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeBase64Url(encoded).toString('utf8')).toBe('OpenAPI 安全令牌')
  })

  it('signs and verifies HMAC values without accepting tampering', () => {
    const signature = createHmacSignature('payload', 'secret')

    expect(hasValidHmacSignature('payload', signature, 'secret')).toBe(true)
    expect(hasValidHmacSignature('tampered', signature, 'secret')).toBe(false)
    expect(hasValidHmacSignature('payload', `${signature}x`, 'secret')).toBe(false)
  })

  it('compares equal-length strings in constant time', () => {
    expect(isTimingSafeEqual('same', 'same')).toBe(true)
    expect(isTimingSafeEqual('same', 'diff')).toBe(false)
    expect(isTimingSafeEqual('short', 'longer')).toBe(false)
  })
})
