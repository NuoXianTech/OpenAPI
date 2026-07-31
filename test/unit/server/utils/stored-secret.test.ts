import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('useRuntimeConfig', () => ({
  apiKeySecret: '0123456789abcdef0123456789abcdef'
}))

const {
  createStoredSecretPreview,
  decryptStoredSecret,
  digestStoredSecret,
  encryptStoredSecret,
  getApiKeySecret
} = await import('~~/server/utils/stored-secret')

describe('stored secret codec', () => {
  it('reads NUXT_API_KEY_SECRET from the top-level runtime config', () => {
    expect(getApiKeySecret()).toHaveLength(32)
  })

  it('encrypts credentials reversibly without deterministic ciphertext', () => {
    const first = encryptStoredSecret('op_example-secret', 'api-key')
    const second = encryptStoredSecret('op_example-secret', 'api-key')

    expect(first).not.toBe(second)
    expect(first).not.toContain('op_example-secret')
    expect(decryptStoredSecret(first, 'api-key')).toBe('op_example-secret')
  })

  it('creates stable, domain-separated lookup digests', () => {
    const first = digestStoredSecret('SAME-VALUE', 'api-key')
    const second = digestStoredSecret('SAME-VALUE', 'api-key')
    const redemption = digestStoredSecret('SAME-VALUE', 'redemption-code')

    expect(first).toBe(second)
    expect(first).not.toBe(redemption)
    expect(first).toHaveLength(64)
  })

  it('creates a masked database preview', () => {
    expect(createStoredSecretPreview('ABCDEFGHIJKLMN')).toBe('ABCDEF••••KLMN')
  })
})
