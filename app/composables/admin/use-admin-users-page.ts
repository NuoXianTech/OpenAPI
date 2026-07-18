import { watchDebounced } from '@vueuse/core'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, watch, type ComputedRef } from 'vue'
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

interface AdminUserFilterOption<TValue extends string> {
  label: string
  value: TValue
}

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
  const { t } = useI18n()
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
      toast.add({ title: t('common.feedback.deleted'), color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
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
      toast.add({ title: t('admin.users.feedback.banned'), color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('admin.users.feedback.banFailed')), color: 'error' })
      return false
    }
  }

  async function unbanUser(item: AdminUserItem) {
    try {
      await $fetch('/api/admin/users/ban', {
        method: 'POST',
        body: { id: item.id, isBanned: false }
      })
      toast.add({ title: t('admin.users.feedback.unbanned'), color: 'success' })
      await refresh()
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('admin.users.feedback.unbanFailed')), color: 'error' })
    }
  }

  async function updateUser(id: number, payload: { email: string, displayName: string, role: 'user' | 'admin', isActive: boolean, password?: string }): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/update', {
        method: 'PUT',
        body: { id, ...payload }
      })
      toast.add({ title: t('admin.users.feedback.updated'), color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('common.feedback.updateFailed')), color: 'error' })
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
      toast.add({ title: t('admin.users.feedback.created'), color: 'success' })
      await refresh()
      return true
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('common.feedback.createFailed')), color: 'error' })
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
  openDelete: (row: AdminUserItem) => void | Promise<void>
}

interface UseAdminUsersDisplayMetaReturn {
  roleFilterOptions: ComputedRef<Array<AdminUserFilterOption<AdminUserRoleFilter>>>
  activeFilterOptions: ComputedRef<Array<AdminUserFilterOption<AdminUserActiveFilter>>>
  banFilterOptions: ComputedRef<Array<AdminUserFilterOption<AdminUserBanFilter>>>
  columns: ComputedRef<TableColumn<AdminUserItem>[]>
  banTooltip: (row: AdminUserItem) => string
  getRowItems: (row: AdminUserItem) => DropdownMenuItem[]
}

export function useAdminUsersDisplayMeta(
  options: UseAdminUsersDisplayMetaOptions
): UseAdminUsersDisplayMetaReturn {
  const { t, locale } = useI18n()
  const roleFilterOptions = computed<Array<AdminUserFilterOption<AdminUserRoleFilter>>>(() => [
    { label: t('admin.users.filters.allRoles'), value: 'all' },
    { label: t('common.identities.admin'), value: 'admin' },
    { label: t('common.identities.user'), value: 'user' }
  ])
  const activeFilterOptions = computed<Array<AdminUserFilterOption<AdminUserActiveFilter>>>(() => [
    { label: t('admin.users.filters.allActiveStatuses'), value: 'all' },
    { label: t('common.accounts.active'), value: 'active' },
    { label: t('common.accounts.inactive'), value: 'inactive' }
  ])
  const banFilterOptions = computed<Array<AdminUserFilterOption<AdminUserBanFilter>>>(() => [
    { label: t('admin.users.filters.allBanStatuses'), value: 'all' },
    { label: t('common.accounts.banned'), value: 'banned' },
    { label: t('common.accounts.unbanned'), value: 'unbanned' }
  ])
  const columns = computed<TableColumn<AdminUserItem>[]>(() => [
    { accessorKey: 'username', header: t('admin.users.columns.username') },
    { accessorKey: 'role', header: t('admin.users.columns.role') },
    { accessorKey: 'email', header: t('admin.users.columns.email') },
    { accessorKey: 'credits', header: t('admin.users.columns.credits') },
    { accessorKey: 'isActive', header: t('admin.users.columns.status') },
    { accessorKey: 'isBanned', header: t('admin.users.columns.ban') },
    { accessorKey: 'createdAt', header: t('admin.users.columns.createdAt') },
    { id: 'actions', header: '' }
  ])

  function banTooltip(row: AdminUserItem): string {
    const reason = row.bannedReason
      ? t('admin.users.banTooltip.reason', { reason: row.bannedReason })
      : t('admin.users.banTooltip.noReason')
    const duration = row.bannedUntil
      ? t('admin.users.banTooltip.until', {
          time: formatDateTime(row.bannedUntil, '-', locale.value)
        })
      : t('common.accounts.permanentBan')
    return `${reason}\n${duration}`
  }

  function getRowItems(row: AdminUserItem): DropdownMenuItem[] {
    return [{
      label: t('admin.users.actions.edit'),
      icon: 'i-mdi-pencil-outline',
      onSelect: () => options.openEdit(row)
    }, {
      label: row.isBanned ? t('admin.users.actions.unban') : t('admin.users.actions.ban'),
      icon: row.isBanned ? 'i-mdi-lock-open-outline' : 'i-mdi-lock-outline',
      onSelect: () => row.isBanned ? options.openUnban(row) : options.openBan(row)
    }, {
      label: t('admin.users.actions.apiKeys'),
      icon: 'i-mdi-key-variant',
      onSelect: () => options.openKeys(row)
    }, {
      type: 'separator'
    }, {
      label: t('common.actions.delete'),
      icon: 'i-mdi-delete-outline',
      color: 'error',
      onSelect: () => options.openDelete(row)
    }]
  }

  return {
    roleFilterOptions,
    activeFilterOptions,
    banFilterOptions,
    columns,
    banTooltip,
    getRowItems
  }
}
