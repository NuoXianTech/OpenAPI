import { describe, expect, it } from 'vitest'
import {
  formatPasswordGeneratorMarkdown,
  formatPasswordGeneratorText,
  generatePassword,
  isPasswordGeneratorEncoding,
  parsePasswordGeneratorMode,
  parsePasswordLength
} from '~~/server/lib/password-generator'

const AMBIGUOUS_CHARACTERS = /[01iIlLoO]/

describe('password generator helpers', () => {
  it('generates a strong password with every selected character type', () => {
    const result = generatePassword({ length: 32, mode: 'strong' })
    const minimum = generatePassword({ length: 4, mode: 'strong' })

    expect(result.password).toHaveLength(32)
    expect(result.password).toMatch(/[a-z]/)
    expect(result.password).toMatch(/[A-Z]/)
    expect(result.password).toMatch(/[2-9]/)
    expect(result.password).toMatch(/[!@#$%^&*_+=?-]/)
    expect(result.password).not.toMatch(AMBIGUOUS_CHARACTERS)
    expect(result).toMatchObject({
      length: 32,
      mode: 'strong',
      character_types: ['lowercase', 'uppercase', 'numbers', 'symbols'],
      ambiguous_characters_excluded: true
    })
    expect(result.entropy).toBeGreaterThan(100)
    expect(result.strength).toBe('极强')
    expect(minimum.password).toHaveLength(4)
    expect(minimum.password).toMatch(/[a-z]/)
    expect(minimum.password).toMatch(/[A-Z]/)
    expect(minimum.password).toMatch(/[2-9]/)
    expect(minimum.password).toMatch(/[!@#$%^&*_+=?-]/)
  })

  it('supports concise alphanumeric and numeric modes', () => {
    const alphanumeric = generatePassword({ length: 12, mode: 'alphanumeric' })
    const numeric = generatePassword({ length: 8, mode: 'numeric' })

    expect(alphanumeric.password).toMatch(/^[A-HJ-KM-NP-Za-hj-km-np-z2-9]+$/)
    expect(alphanumeric.password).toMatch(/[a-z]/)
    expect(alphanumeric.password).toMatch(/[A-Z]/)
    expect(alphanumeric.password).toMatch(/[2-9]/)
    expect(numeric.password).toMatch(/^[2-9]{8}$/)
    expect(numeric.character_types).toEqual(['numbers'])
  })

  it('validates length and mode without accepting partial numbers', () => {
    expect(parsePasswordLength('')).toBe(16)
    expect(parsePasswordLength('4')).toBe(4)
    expect(parsePasswordLength('128')).toBe(128)
    expect(parsePasswordLength('3')).toBeNull()
    expect(parsePasswordLength('129')).toBeNull()
    expect(parsePasswordLength('16px')).toBeNull()
    expect(parsePasswordLength('1e2')).toBeNull()

    expect(parsePasswordGeneratorMode('')).toBe('strong')
    expect(parsePasswordGeneratorMode('ALPHANUMERIC')).toBe('alphanumeric')
    expect(parsePasswordGeneratorMode('numeric')).toBe('numeric')
    expect(parsePasswordGeneratorMode('custom')).toBeNull()
  })

  it('rejects invalid direct generation options', () => {
    expect(() => generatePassword({ length: 3, mode: 'strong' })).toThrow('4-128')
    expect(() => generatePassword({ length: 129, mode: 'numeric' })).toThrow('4-128')
    expect(() => generatePassword({ length: 16, mode: 'custom' as never })).toThrow('mode')
  })

  it('formats text and Markdown responses', () => {
    const result = generatePassword({ length: 16, mode: 'strong' })

    expect(formatPasswordGeneratorText(result)).toBe(result.password)
    expect(formatPasswordGeneratorMarkdown(result)).toContain(result.password)
    expect(formatPasswordGeneratorMarkdown(result)).toContain('模式：strong')
    expect(isPasswordGeneratorEncoding('json')).toBe(true)
    expect(isPasswordGeneratorEncoding('text')).toBe(true)
    expect(isPasswordGeneratorEncoding('markdown')).toBe(true)
    expect(isPasswordGeneratorEncoding('md')).toBe(true)
    expect(isPasswordGeneratorEncoding('html')).toBe(false)
  })
})
