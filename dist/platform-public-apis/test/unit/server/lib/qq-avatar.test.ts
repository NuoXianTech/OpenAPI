import { describe, expect, it } from 'vitest'
import {
  createQqAvatarData,
  normalizeQqNumber,
  parseQqAvatarOutputType,
  parseQqAvatarSize
} from '~~/server/lib/qq-avatar'

describe('QQ avatar input', () => {
  it('validates QQ numbers without numeric precision loss', () => {
    expect(normalizeQqNumber(' 10000 ')).toBe('10000')
    expect(normalizeQqNumber('123456789012')).toBe('123456789012')
    expect(normalizeQqNumber('01234')).toBeNull()
    expect(normalizeQqNumber('1234')).toBeNull()
    expect(normalizeQqNumber('1234567890123')).toBeNull()
    expect(normalizeQqNumber('1234a')).toBeNull()
  })

  it('uses explicit size and output allowlists', () => {
    expect(parseQqAvatarSize('')).toBe(100)
    expect(parseQqAvatarSize('40')).toBe(40)
    expect(parseQqAvatarSize('640')).toBe(640)
    expect(parseQqAvatarSize('200')).toBeNull()
    expect(parseQqAvatarSize('100.0')).toBeNull()
    expect(parseQqAvatarSize('1e2')).toBeNull()

    expect(parseQqAvatarOutputType('')).toBe('json')
    expect(parseQqAvatarOutputType('IMAGE')).toBe('image')
    expect(parseQqAvatarOutputType('redirect')).toBeNull()
    expect(parseQqAvatarOutputType('download')).toBeNull()
  })

  it('creates the canonical Tencent avatar URL', () => {
    expect(createQqAvatarData('10000', 140)).toEqual({
      qq: '10000',
      size: 140,
      url: 'https://q1.qlogo.cn/g?b=qq&nk=10000&s=140'
    })
  })
})
