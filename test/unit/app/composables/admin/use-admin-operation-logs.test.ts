import { describe, expect, it } from 'vitest'
import { resolveOperationLogActorKind } from '@/composables/admin/use-admin-call-logs-page'

describe('operation log actor kind', () => {
  it('classifies actor kind by action namespace instead of user id presence', () => {
    expect(resolveOperationLogActorKind('admin.user.update', 1)).toBe('admin')
    expect(resolveOperationLogActorKind('user.password.change', 1)).toBe('user')
    expect(resolveOperationLogActorKind('admin.settings.update', null)).toBe('admin')
    expect(resolveOperationLogActorKind('system.cleanup', null)).toBe('system')
  })
})
