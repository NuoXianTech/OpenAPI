import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/utils/auth-secret', () => ({
  getAuthSecret: () => 'system-settings-test-secret-with-at-least-32-bytes'
}))

const {
  decodeSystemSettingSecret,
  encodeSystemSettingSecret
} = await import('~~/server/utils/system-setting-secret')

describe('system setting secret codec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('encrypts and decrypts secret values', () => {
    const encoded = encodeSystemSettingSecret('smtp-password')

    expect(encoded).not.toContain('smtp-password')
    expect(decodeSystemSettingSecret(encoded)).toBe('smtp-password')
  })

  it('rejects non-empty plaintext secret values', () => {
    expect(() => decodeSystemSettingSecret('plaintext')).toThrow('不是受支持的密文格式')
  })

  it('encrypts plaintext even when it resembles the ciphertext prefix', () => {
    const plaintext = 'enc:system-setting:v1:not-actually-encrypted'
    const encoded = encodeSystemSettingSecret(plaintext)

    expect(encoded).not.toBe(plaintext)
    expect(decodeSystemSettingSecret(encoded)).toBe(plaintext)
  })
})
