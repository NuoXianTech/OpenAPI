import { parseFetchError } from '#shared/utils/clientError'

export interface AdminUserItem {
  id: number
  username: string
  email: string | null
  displayName: string | null
  isActive: boolean
  isBanned: boolean
  bannedReason?: string | null
  bannedUntil?: string | null
  credits?: number | string | null
  createdAt: string
}

export function useAdminUsersPage() {
  const toast = useToast()

  const keyword = ref('')
  const { data, status, refresh } = useLazyFetch<AdminUserItem[]>('/api/admin/users/list', {
    query: computed(() => ({ keyword: keyword.value || undefined })),
    default: () => []
  })
  const items = computed(() => data.value || [])

  const rowSelection = ref<Record<string, boolean>>({})
  const selectedIds = computed(() =>
    Object.keys(rowSelection.value).filter(k => rowSelection.value[k]).map(Number)
  )

  function clearSelection() {
    rowSelection.value = {}
  }

  function requireSelection(): boolean {
    if (selectedIds.value.length === 0) {
      toast.add({ title: '请先勾选用户', color: 'warning' })
      return false
    }
    return true
  }

  async function deleteUser(id: number): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/delete', { method: 'POST', body: { id } })
      toast.add({ title: '删除成功', color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
      return false
    }
  }

  async function banUser(id: number, payload: { reason: string, bannedUntil: string | null }): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/ban', {
        method: 'POST',
        body: {
          id,
          isBanned: true,
          reason: payload.reason || undefined,
          bannedUntil: payload.bannedUntil
        }
      })
      toast.add({ title: '已封禁', color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, '封禁失败'), color: 'error' })
      return false
    }
  }

  async function unbanUser(item: AdminUserItem) {
    try {
      await $fetch('/api/admin/users/ban', {
        method: 'POST',
        body: { id: item.id, isBanned: false }
      })
      toast.add({ title: '已解封', color: 'success' })
      await refresh()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '解封失败'), color: 'error' })
    }
  }

  async function updateUser(id: number, payload: { username: string, email: string, displayName: string, isActive: boolean }): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/update', {
        method: 'PUT',
        body: { id, ...payload }
      })
      toast.add({ title: '更新成功', color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, '更新失败'), color: 'error' })
      return false
    }
  }

  async function createUser(payload: { username: string, email: string, password: string, displayName: string, isActive: boolean }): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/create', {
        method: 'POST',
        body: {
          username: payload.username,
          email: payload.email,
          password: payload.password,
          displayName: payload.displayName || undefined,
          isActive: payload.isActive
        }
      })
      toast.add({ title: '创建成功', color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, '创建失败'), color: 'error' })
      return false
    }
  }

  return {
    keyword,
    status,
    items,
    refresh,
    rowSelection,
    selectedIds,
    clearSelection,
    requireSelection,
    deleteUser,
    banUser,
    unbanUser,
    updateUser,
    createUser
  }
}
