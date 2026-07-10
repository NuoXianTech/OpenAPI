import { describe, expect, it } from 'vitest'
import { formatAdminIdentity, formatUserIdentity } from '@/utils/log-identity'

describe('log identity labels', () => {
  it('keeps business users distinct from administrator audit actors', () => {
    expect(formatUserIdentity(1)).toBe('用户 #1')
    expect(formatAdminIdentity(1)).toBe('管理员 #1')
  })
})
