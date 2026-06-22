import { describe, expect, it } from 'vitest'
import { useAdminUsersPage } from '../../../../app/composables/admin/useAdminUsersPage'

describe('useAdminUsersPage', () => {
  it('clears selection through the public clearSelection API', () => {
    const page = useAdminUsersPage()

    page.rowSelection.value = { 1: true, 2: true }
    expect(page.selectedIds.value).toEqual([1, 2])

    page.clearSelection()
    expect(page.selectedIds.value).toEqual([])
  })
})
