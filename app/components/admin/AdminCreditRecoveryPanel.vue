<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'
import { parseFetchError } from '~/utils/client-error'
import type { CreditReservationItem, CreditReservationStatus } from '#shared/types/admin-credits'

interface CreditReservationFilters extends Record<string, unknown> {
  status: CreditReservationStatus | 'all'
}

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirmDialog()

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  error,
  refresh,
  applyFilters
} = usePrivatePagedList<CreditReservationFilters, CreditReservationItem>({
  path: '/api/admin/credits/reservations',
  defaultFilters: { status: 'dead_letter' },
  buildQuery: (currentFilters, pagination) => ({
    status: currentFilters.status === 'all' ? undefined : currentFilters.status,
    limit: pagination.limit,
    offset: pagination.offset
  })
})

const statusItems = computed(() => [
  { label: t('admin.credits.reservations.allStatuses'), value: 'all' },
  { label: t('admin.credits.reservations.statuses.dead_letter'), value: 'dead_letter' },
  { label: t('admin.credits.reservations.statuses.pending'), value: 'pending' },
  { label: t('admin.credits.reservations.statuses.active'), value: 'active' }
])

const columns = computed<TableColumn<CreditReservationItem>[]>(() => [
  { accessorKey: 'createdAt', header: t('admin.credits.reservations.columns.createdAt') },
  { id: 'user', header: t('admin.credits.reservations.columns.user') },
  { id: 'api', header: t('admin.credits.reservations.columns.api') },
  { accessorKey: 'amount', header: t('admin.credits.reservations.columns.amount') },
  { accessorKey: 'status', header: t('admin.credits.reservations.columns.status') },
  { accessorKey: 'attempts', header: t('admin.credits.reservations.columns.attempts') },
  { accessorKey: 'lastError', header: t('admin.credits.reservations.columns.error') },
  { id: 'actions', header: '' }
])

function statusColor(status: CreditReservationStatus) {
  if (status === 'dead_letter') return 'error' as const
  if (status === 'pending') return 'warning' as const
  return 'neutral' as const
}

async function runAction(row: CreditReservationItem, name: 'retry' | 'charge' | 'release') {
  try {
    await $fetch(`/api/admin/credits/reservations/${row.id}/${name}`, { method: 'POST' })
    const feedbackKey = name === 'retry' ? 'retried' : name === 'charge' ? 'charged' : 'released'
    toast.add({ title: t(`admin.credits.reservations.feedback.${feedbackKey}`), color: 'success' })
    await refresh()
  } catch (actionError) {
    toast.add({ title: parseFetchError(actionError, t('common.feedback.operationFailed')), color: 'error' })
    throw actionError
  }
}

async function confirmAction(row: CreditReservationItem, name: 'charge' | 'release') {
  const key = name === 'charge' ? 'confirmCharge' : 'confirmRelease'
  await confirm({
    title: t(`admin.credits.reservations.${key}.title`, { amount: row.amount.toLocaleString(locale.value) }),
    description: t(`admin.credits.reservations.${key}.description`),
    onConfirm: () => runAction(row, name)
  })
}

function getRowItems(row: CreditReservationItem): DropdownMenuItem[][] {
  return [[
    ...(row.status === 'dead_letter'
      ? [{
          label: t('admin.credits.reservations.actions.retry'),
          icon: 'i-lucide-refresh-cw',
          onSelect: () => runAction(row, 'retry')
        }]
      : []),
    ...(row.status !== 'active'
      ? [{
          label: t('admin.credits.reservations.actions.charge'),
          icon: 'i-lucide-badge-check',
          onSelect: () => confirmAction(row, 'charge')
        }]
      : []),
    {
      label: t('admin.credits.reservations.actions.release'),
      icon: 'i-lucide-undo-2',
      color: 'warning',
      onSelect: () => confirmAction(row, 'release')
    }
  ]]
}
</script>

<template>
  <DashboardTableCard
    :title="$t('admin.credits.reservations.title')"
    :description="$t('admin.credits.reservations.description')"
    icon="i-lucide-shield-alert"
    :total="total"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <USelect
          v-model="filters.status"
          :items="statusItems"
          value-key="value"
          size="sm"
          class="w-40"
          :aria-label="$t('admin.credits.reservations.filterStatus')"
          @update:model-value="applyFilters"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="loading"
          :aria-label="$t('common.actions.refresh')"
          @click="refresh"
        />
      </div>
    </template>

    <div
      v-if="error"
      class="border-b border-default p-3"
    >
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="parseFetchError(error, $t('common.feedback.loadFailed'))"
      />
    </div>

    <DashboardDataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      :data="items"
      :columns="columns"
      :loading="loading"
      :total="total"
      :page-size-options="PAGE_SIZE_OPTIONS"
      :fixed="false"
      :empty-title="$t('admin.credits.reservations.empty')"
      empty-icon="i-lucide-shield-check"
    >
      <template #createdAt-cell="{ row }">
        <span class="whitespace-nowrap text-xs text-muted">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
      </template>
      <template #user-cell="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ row.original.username || $t('common.accounts.deletedUser') }}</span>
          <span class="text-xs text-muted">#{{ row.original.userId }} · {{ row.original.apiKeyName || '-' }}</span>
        </div>
      </template>
      <template #api-cell="{ row }">
        <div class="flex max-w-72 flex-col">
          <span class="truncate text-sm">{{ row.original.routeName || '-' }}</span>
          <code class="truncate text-xs text-muted">{{ row.original.routePath || row.original.requestId }}</code>
        </div>
      </template>
      <template #amount-cell="{ row }">
        <span class="font-semibold tabular-nums">{{ row.original.amount.toLocaleString(locale) }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :color="statusColor(row.original.status)"
          variant="subtle"
        >
          {{ $t(`admin.credits.reservations.statuses.${row.original.status}`) }}
        </UBadge>
      </template>
      <template #lastError-cell="{ row }">
        <span class="block max-w-80 truncate text-xs text-muted">{{ row.original.lastError || '-' }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="text-right">
          <UDropdownMenu
            :items="getRowItems(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </UDropdownMenu>
        </div>
      </template>
    </DashboardDataTable>
  </DashboardTableCard>
</template>
