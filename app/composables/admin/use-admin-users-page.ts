import { watchDebounced } from '@vueuse/core'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, watch } from 'vue'
import { parseFetchError } from '~/utils/client-error'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { formatDateTime } from '~/utils/datetime'

export interface AdminUserItem {
  id: number
  role: 'user' | 'admin'
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

export type AdminUserRoleFilter = 'all' | AdminUserItem['role']
export type AdminUserActiveFilter = 'all' | 'active' | 'inactive'
export type AdminUserBanFilter = 'all' | 'banned' | 'unbanned'

export interface AdminUserFilterOption<TValue extends string> {
  label: string
  value: TValue
}

export const ADMIN_USER_ROLE_FILTER_OPTIONS: Array<AdminUserFilterOption<AdminUserRoleFilter>> = [
  { label: '全部角色', value: 'all' },
  { label: '管理员', value: 'admin' },
  { label: '用户', value: 'user' }
]

export const ADMIN_USER_ACTIVE_FILTER_OPTIONS: Array<AdminUserFilterOption<AdminUserActiveFilter>> = [
  { label: '全部激活状态', value: 'all' },
  { label: '已激活', value: 'active' },
  { label: '未激活', value: 'inactive' }
]

export const ADMIN_USER_BAN_FILTER_OPTIONS: Array<AdminUserFilterOption<AdminUserBanFilter>> = [
  { label: '全部封禁状态', value: 'all' },
  { label: '已封禁', value: 'banned' },
  { label: '未封禁', value: 'unbanned' }
]

function serializeBooleanFilter<TValue extends string>(
  value: TValue,
  trueValue: TValue,
  falseValue: TValue
): boolean | undefined {
  if (value === trueValue) return true
  if (value === falseValue) return false
  return undefined
}

function normalizeUserIdFilter(value: number | undefined): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? value : undefined
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
  const userIdFilter = ref<number>()
  const roleFilter = ref<AdminUserRoleFilter>('all')
  const activeFilter = ref<AdminUserActiveFilter>('all')
  const banFilter = ref<AdminUserBanFilter>('all')
  const activeFilterCount = computed(() => [
    normalizeUserIdFilter(userIdFilter.value) !== undefined,
    roleFilter.value !== 'all',
    activeFilter.value !== 'all',
    banFilter.value !== 'all'
  ].filter(Boolean).length)

  const { data, loading, refresh } = usePrivateResource<AdminUserItem[]>({
    path: '/api/admin/users/list',
    defaultData: () => [],
    query: computed(() => ({
      keyword: keyword.value.trim() || undefined,
      userId: normalizeUserIdFilter(userIdFilter.value),
      role: roleFilter.value === 'all' ? undefined : roleFilter.value,
      isActive: serializeBooleanFilter(activeFilter.value, 'active', 'inactive'),
      isBanned: serializeBooleanFilter(banFilter.value, 'banned', 'unbanned')
    }))
  })

  watchDebounced(keyword, () => { void refresh() }, { debounce: 250, maxWait: 1000 })
  watchDebounced(userIdFilter, () => { void refresh() }, { debounce: 250, maxWait: 1000 })
  watch([roleFilter, activeFilter, banFilter], () => { void refresh() })

  function resetFilters() {
    userIdFilter.value = undefined
    roleFilter.value = 'all'
    activeFilter.value = 'all'
    banFilter.value = 'all'
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

  async function updateUser(id: number, payload: { email: string, displayName: string, role: 'user' | 'admin', isActive: boolean, password?: string }): Promise<boolean> {
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

  async function createUser(payload: { username: string, email: string, password: string, displayName: string, role: 'user' | 'admin', isActive: boolean }): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/create', {
        method: 'POST',
        body: {
          username: payload.username,
          email: payload.email,
          password: payload.password,
          displayName: payload.displayName || undefined,
          role: payload.role,
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
    userIdFilter,
    roleFilter,
    activeFilter,
    banFilter,
    activeFilterCount,
    resetFilters,
    loading,
    items: data,
    refresh,
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
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'role', header: '类型' },
  { accessorKey: 'email', header: '邮箱' },
  { accessorKey: 'credits', header: '积分' },
  { accessorKey: 'isActive', header: '状态' },
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
