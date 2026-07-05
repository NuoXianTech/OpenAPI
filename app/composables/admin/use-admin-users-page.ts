import { watchDebounced } from '@vueuse/core'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'
import { parseFetchError } from '~~/shared/utils/client-error'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { formatDateTime } from '~/utils/datetime'

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

interface ToastLike {
  add: (notification: { title: string, color?: 'success' | 'error' | 'warning' }) => void
}

function createSilentToast(): ToastLike {
  return { add: () => {} }
}

export function useAdminUsersPage() {
  const toast = (() => {
    try {
      if (typeof useToast === 'function') return useToast()
    } catch {
      // Direct unit tests run without Nuxt UI injection.
    }
    return createSilentToast()
  })()
  const keyword = ref('')
  const { data, status, refresh } = usePrivateResource<AdminUserItem[]>({
    path: '/api/admin/users/list',
    defaultData: () => [],
    query: computed(() => ({ keyword: keyword.value.trim() || undefined }))
  })
  const items = computed(() => data.value)

  watchDebounced(keyword, () => { void refresh() }, { debounce: 250, maxWait: 1000 })

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

  async function updateUser(id: number, payload: { username: string, email: string, displayName: string, isActive: boolean, password?: string }): Promise<boolean> {
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

interface UseAdminUsersDisplayMetaOptions {
  openEdit: (row: AdminUserItem) => void | Promise<void>
  openBan: (row: AdminUserItem) => void | Promise<void>
  openUnban: (row: AdminUserItem) => void | Promise<void>
  openKeys: (row: AdminUserItem) => void | Promise<void>
  openCreditForOne: (row: AdminUserItem) => void | Promise<void>
  openDelete: (row: AdminUserItem) => void | Promise<void>
}

interface UseAdminUsersDisplayMetaReturn {
  columns: TableColumn<AdminUserItem>[]
  banTooltip: (row: AdminUserItem) => string
  getRowItems: (row: AdminUserItem) => DropdownMenuItem[]
}

const ADMIN_USER_TABLE_COLUMNS: TableColumn<AdminUserItem>[] = [
  { id: 'select' },
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'email', header: '邮箱' },
  { accessorKey: 'credits', header: '积分' },
  { accessorKey: 'isActive', header: '激活' },
  { accessorKey: 'isBanned', header: '封禁' },
  { accessorKey: 'createdAt', header: '注册时间' },
  { id: 'actions', header: '' }
]

function buildAdminUserBanTooltip(row: AdminUserItem): string {
  const parts: string[] = []
  parts.push(row.bannedReason ? `原因：${row.bannedReason}` : '原因：未填写')
  parts.push(row.bannedUntil ? `解封时间：${formatDateTime(row.bannedUntil)}` : '永久封禁')
  return parts.join('\n')
}

export function useAdminUsersDisplayMeta(
  options: UseAdminUsersDisplayMetaOptions
): UseAdminUsersDisplayMetaReturn {
  function getRowItems(row: AdminUserItem): DropdownMenuItem[] {
    return [{
      label: '编辑',
      icon: 'i-mdi-pencil-outline',
      onSelect: () => options.openEdit(row)
    }, {
      label: row.isBanned ? '解封' : '封禁',
      icon: row.isBanned ? 'i-mdi-lock-open-outline' : 'i-mdi-lock-outline',
      onSelect: () => row.isBanned ? options.openUnban(row) : options.openBan(row)
    }, {
      label: 'API Keys',
      icon: 'i-mdi-key-variant',
      onSelect: () => options.openKeys(row)
    }, {
      label: '积分管理',
      icon: 'i-mdi-cash-multiple',
      onSelect: () => options.openCreditForOne(row)
    }, {
      type: 'separator'
    }, {
      label: '删除',
      icon: 'i-mdi-delete-outline',
      color: 'error',
      onSelect: () => options.openDelete(row)
    }]
  }

  return {
    columns: ADMIN_USER_TABLE_COLUMNS,
    banTooltip: buildAdminUserBanTooltip,
    getRowItems
  }
}
