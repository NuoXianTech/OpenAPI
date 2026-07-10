import { describe, expect, it } from 'vitest'
import { resolveOperationLogActorLabel } from '@/composables/admin/use-admin-call-logs-page'

describe('operation log actor labels', () => {
  it('classifies actor kind by action namespace instead of user id presence', () => {
    expect(resolveOperationLogActorLabel('admin.user.update', 1)).toBe('管理员 #1')
    expect(resolveOperationLogActorLabel('user.password.change', 1)).toBe('用户 #1')
    expect(resolveOperationLogActorLabel('admin.settings.update', null)).toBe('管理员')
    expect(resolveOperationLogActorLabel('system.cleanup', null)).toBe('系统')
  })
})
