import { describe, expect, it } from 'vitest'
import {
  checkPasswordStrength,
  countPasswordCodePoints,
  formatPasswordCheckMarkdown,
  formatPasswordCheckText,
  isPasswordCheckEncoding,
  parsePasswordCheckBody
} from '~~/server/lib/password-check'

describe('password check helpers', () => {
  it('rates a long mixed password without returning its plaintext', () => {
    const password = 'N7!vK2@qP9#xR4$z'
    const result = checkPasswordStrength(password)

    expect(result).toMatchObject({
      length: 16,
      strength: '极强',
      character_analysis: {
        has_lowercase: true,
        has_uppercase: true,
        has_numbers: true,
        has_symbols: true,
        has_repeated: false,
        has_sequential: false,
        is_common_password: false
      }
    })
    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.time_to_crack).toContain('估算')
    expect(JSON.stringify(result)).not.toContain(password)
    expect(result).not.toHaveProperty('password')
  })

  it('penalizes common, repeated and sequential passwords', () => {
    const common = checkPasswordStrength('password')
    const patterned = checkPasswordStrength('abc111')

    expect(common.strength).toBe('极弱')
    expect(common.character_analysis.is_common_password).toBe(true)
    expect(common.recommendations).toContain('不要使用已知的常见密码')
    expect(patterned.character_analysis.has_sequential).toBe(true)
    expect(patterned.character_analysis.has_repeated).toBe(true)
    expect(patterned.score).toBeLessThan(30)
  })

  it('counts Unicode code points without trimming or normalizing the password', () => {
    const password = '密码🔐A1!'
    const result = checkPasswordStrength(password)

    expect(password.length).toBe(7)
    expect(countPasswordCodePoints(password)).toBe(6)
    expect(result.length).toBe(6)
    expect(result.character_analysis.has_other_letters).toBe(true)
    expect(parsePasswordCheckBody({ password: '  ' })).toEqual({ ok: true, password: '  ' })
  })

  it('validates the body and enforces the Unicode code point limit', () => {
    const maxLengthPassword = '🔐'.repeat(128)

    expect(parsePasswordCheckBody(null)).toMatchObject({ ok: false, code: 'INVALID_REQUEST_BODY' })
    expect(parsePasswordCheckBody({ password: 123 })).toMatchObject({ ok: false, code: 'INVALID_REQUEST_BODY' })
    expect(parsePasswordCheckBody({ password: '' })).toMatchObject({ ok: false, code: 'PASSWORD_REQUIRED' })
    expect(parsePasswordCheckBody({ password: maxLengthPassword })).toMatchObject({ ok: true })
    expect(parsePasswordCheckBody({ password: `${maxLengthPassword}🔐` })).toMatchObject({
      ok: false,
      code: 'PASSWORD_TOO_LONG'
    })
    expect(() => checkPasswordStrength('')).toThrow('password 不能为空')
    expect(() => checkPasswordStrength(`${maxLengthPassword}🔐`)).toThrow('128 个 Unicode 码点')
  })

  it('formats text and Markdown without leaking the checked password', () => {
    const password = 'Never-Echo-This-2026!'
    const result = checkPasswordStrength(password)
    const text = formatPasswordCheckText(result)
    const markdown = formatPasswordCheckMarkdown(result)

    expect(text).toContain('密码强度检测')
    expect(markdown).toContain('# 密码强度检测')
    expect(text).not.toContain(password)
    expect(markdown).not.toContain(password)
  })

  it('accepts only the documented response encodings', () => {
    expect(isPasswordCheckEncoding('json')).toBe(true)
    expect(isPasswordCheckEncoding('text')).toBe(true)
    expect(isPasswordCheckEncoding('markdown')).toBe(true)
    expect(isPasswordCheckEncoding('md')).toBe(true)
    expect(isPasswordCheckEncoding('html')).toBe(false)
  })
})
