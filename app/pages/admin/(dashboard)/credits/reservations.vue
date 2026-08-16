<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'
import { parseFetchError } from '~/utils/client-error'

type ReservationStatus = 'active' | 'pending' | 'dead_letter'

interface CreditReservationItem {
  id: number
  userId: number
  username: string | null
  apiKeyName: string | null
  routeName: string | null
  routePath: string | null
  apiCallId: number | null
  requestId: string
  amount: number
  status: ReservationStatus
  attempts: number
  lastError: string | null
  lastAttemptAt: string | null
  createdAt: string
}

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirmDialog()
useHead({ title: () => t('admin.credits.reservations.title') })

const list = usePrivatePagedList<{ status: ReservationStatus | 'all' }, CreditReservationItem>({
  path: '/api/admin/credits/reservations',
  defaultFilters: { status: 'dead_letter' },
  buildQuery: (filters, pagination) => ({
    status: filters.status === 'all' ? undefined : filters.status,
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

function statusColor(status: ReservationStatus) {
  if (status === 'dead_letter') return 'error' as const
  if (status === 'pending') return 'warning' as const
  return 'neutral' as const
}

async function action(row: CreditReservationItem, name: 'retry' | 'charge' | 'release') {
  try {
    await $fetch(`/api/admin/credits/reservations/${row.id}/${name}`, { method: 'POST' })
    toast.add({ title: t(`admin.credits.reservations.feedback.${name === 'retry' ? 'retried' : name === 'charge' ? 'charged' : 'released'}`), color: 'success' })
    await list.refresh()
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
    throw error
  }
}

async function confirmAction(row: CreditReservationItem, name: 'charge' | 'release') {
  await confirm({
    title: t(`admin.credits.reservations.confirm${name === 'charge' ? 'Charge' : 'Release'}.title`, { amount: row.amount.toLocaleString(locale.value) }),
    description: t(`admin.credits.reservations.confirm${name === 'charge' ? 'Charge' : 'Release'}.description`),
    onConfirm: () => action(row, name)
  })
}

function rowItems(row: CreditReservationItem): DropdownMenuItem[][] {
  return [[
    ...(row.status === 'dead_letter'
      ? [{
          label: t('admin.credits.reservations.actions.retry'),
          icon: 'i-lucide-refresh-cw',
          onSelect: () => action(row, 'retry')
        }]
      : []),
    {
      label: t('admin.credits.reservations.actions.charge'),
      icon: 'i-lucide-badge-check',
      onSelect: () => confirmAction(row, 'charge')
    },
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
  <div class="space-y-6">
    <DashboardPageIntro
      :title="$t('admin.credits.reservations.title')"
      :description="$t('admin.credits.reservations.description')"
    />

    <div class="flex flex-wrap items-center gap-2">
      <USelect
        v-model="list.filters.status"
        :items="statusItems"
        value-key="value"
        class="w-52"
        @update:model-value="list.applyFilters"
      />
      <UButton
        class="ml-auto"
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="list.loading.value"
        @click="list.refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
    </div>

    <UAlert
      v-if="list.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="parseFetchError(list.error.value, $t('common.feedback.loadFailed'))"
    />

    <DashboardTableCard
      :title="$t('admin.credits.reservations.title')"
      icon="i-lucide-shield-alert"
      :total="list.total.value"
    >
      <DashboardDataTable
        v-model:page="list.page.value"
        v-model:page-size="list.pageSize.value"
        :data="list.items.value"
        :columns="columns"
        :loading="list.loading.value"
        :total="list.total.value"
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
          <UBadge :color="statusColor(row.original.status)" variant="subtle">
            {{ $t(`admin.credits.reservations.statuses.${row.original.status}`) }}
          </UBadge>
        </template>
        <template #lastError-cell="{ row }">
          <span class="block max-w-80 truncate text-xs text-muted">{{ row.original.lastError || '-' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UDropdownMenu :items="rowItems(row.original)" :content="{ align: 'end' }">
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
  </div>
</template>
