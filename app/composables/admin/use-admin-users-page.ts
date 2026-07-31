import { watchDebounced } from '@vueuse/core'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, toRef, type ComputedRef } from 'vue'
import { parseFetchError } from '~/utils/client-error'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'
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

interface AdminUserFilters extends Record<string, unknown> {
  keyword: string
  userId: number | ''
  role: AdminUserRoleFilter
  active: AdminUserActiveFilter
  ban: AdminUserBanFilter
}

interface AdminUserFilterOption<TValue extends string> {
  label: string
  value: TValue
}

function normalizeUserIdFilter(value: number | '' | undefined): number | undefined {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : undefined
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
  const paged = usePrivatePagedList<AdminUserFilters, AdminUserItem>({
    path: '/api/admin/users/list',
    defaultFilters: {
      keyword: '',
      userId: '',
      role: 'all',
      active: 'all',
      ban: 'all'
    },
    buildQuery: (filters, pagination) => ({
      keyword: filters.keyword.trim() || undefined,
      userId: normalizeUserIdFilter(filters.userId),
      role: filters.role === 'all' ? undefined : filters.role,
      isActive: filters.active === 'all' ? undefined : filters.active === 'active',
      isBanned: filters.ban === 'all' ? undefined : filters.ban === 'banned',
      limit: pagination.limit,
      offset: pagination.offset
    })
  })
  const keyword = toRef(paged.filters, 'keyword')
  const userIdFilter = toRef(paged.filters, 'userId')
  const roleFilter = toRef(paged.filters, 'role')
  const activeFilter = toRef(paged.filters, 'active')
  const banFilter = toRef(paged.filters, 'ban')
  const activeFilterCount = computed(() => [
    normalizeUserIdFilter(userIdFilter.value) !== undefined,
    roleFilter.value !== 'all',
    activeFilter.value !== 'all',
    banFilter.value !== 'all'
  ].filter(Boolean).length)
  let lastAppliedKeyword = ''

  watchDebounced(
    () => keyword.value.trim(),
    (value) => {
      if (value === lastAppliedKeyword) return
      lastAppliedKeyword = value
      void paged.applyFilters()
    },
    { debounce: 250, maxWait: 1000 }
  )

  async function applyFilters() {
    lastAppliedKeyword = keyword.value.trim()
    await paged.applyFilters()
  }

  async function resetFilters() {
    userIdFilter.value = ''
    roleFilter.value = 'all'
    activeFilter.value = 'all'
    banFilter.value = 'all'
    await applyFilters()
  }

  async function deleteUser(id: number): Promise<boolean> {
    try {
      await $fetch('/api/admin/users/delete', { method: 'POST', body: { id } })
      toast.add({ title: t('common.feedback.deleted'), color: 'success' })
      await paged.refresh()
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
      await paged.refresh()
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
      await paged.refresh()
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
      await paged.refresh()
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
      await paged.refresh()
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
    applyFilters,
    resetFilters,
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    loading: paged.loading,
    items: paged.items,
    refresh: paged.refresh,
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
