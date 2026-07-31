<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import type { TableColumn } from '@nuxt/ui'
import type { CreditReasonFilter } from '#shared/types/credit-reason'
import { useCreditReasonMeta } from '~/composables/credits/use-credit-reason-meta'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

const { t, locale } = useI18n()
const { getReasonColor, getReasonLabel } = useCreditReasonMeta()
useHead({ title: () => t('admin.credits.transactions.title') })

function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

interface CreditTxnRow {
  id: number
  userId: number
  userName: string | null
  userRole: 'user' | 'admin' | null
  amount: number
  balanceAfter: number
  reason: string
  apiId: number | null
  apiCallId: number | null
  codeId: number | null
  operatorId: number | null
  operatorName: string | null
  ip: string | null
  remark: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

interface CreditTxnFilters extends Record<string, unknown> {
  userId: number | ''
  reason: CreditReasonFilter
  direction: 'all' | 'in' | 'out'
  operatorName: string
  startAt: string
  endAt: string
  minAmount: number | ''
  maxAmount: number | ''
}

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  refresh,
  applyFilters: apply,
  reset
} = usePrivatePagedList<CreditTxnFilters, CreditTxnRow>({
  path: '/api/admin/users/credits/transactions',
  defaultFilters: {
    userId: '',
    reason: 'all',
    direction: 'all',
    operatorName: '',
    startAt: '',
    endAt: '',
    minAmount: '',
    maxAmount: ''
  },
  buildQuery: (f, p) => ({
    userId: f.userId || undefined,
    reason: f.reason === 'all' ? undefined : f.reason,
    direction: f.direction === 'all' ? undefined : f.direction,
    operatorName: f.operatorName.trim() || undefined,
    startAt: toIsoDateTime(f.startAt),
    endAt: toIsoDateTime(f.endAt),
    minAmount: f.minAmount === '' ? undefined : f.minAmount,
    maxAmount: f.maxAmount === '' ? undefined : f.maxAmount,
    limit: p.limit,
    offset: p.offset
  })
})

const activeFilterCount = computed(() => [
  filters.userId !== '',
  filters.reason !== 'all',
  filters.direction !== 'all',
  filters.operatorName.trim() !== '',
  filters.startAt !== '',
  filters.endAt !== '',
  filters.minAmount !== '',
  filters.maxAmount !== ''
].filter(Boolean).length)

const reasonItems = computed(() => [
  { label: t('admin.credits.transactions.filters.allReasons'), value: 'all' },
  { label: getReasonLabel('admin_grant'), value: 'admin_grant' },
  { label: getReasonLabel('admin_revoke'), value: 'admin_revoke' },
  { label: getReasonLabel('admin_reset'), value: 'admin_reset' },
  { label: getReasonLabel('api_charge'), value: 'api_charge' },
  { label: getReasonLabel('api_refund'), value: 'api_refund' },
  { label: getReasonLabel('signup_bonus'), value: 'signup_bonus' },
  { label: getReasonLabel('redemption_code'), value: 'redemption_code' },
  { label: getReasonLabel('checkin'), value: 'checkin' }
])

const directionItems = computed(() => [
  { label: t('admin.credits.transactions.filters.allDirections'), value: 'all' },
  { label: t('admin.credits.transactions.filters.income'), value: 'in' },
  { label: t('admin.credits.transactions.filters.expense'), value: 'out' }
])

const columns = computed<TableColumn<CreditTxnRow>[]>(() => [
  { accessorKey: 'createdAt', header: t('admin.credits.transactions.columns.time') },
  { accessorKey: 'userId', header: t('admin.credits.transactions.columns.user') },
  { accessorKey: 'reason', header: t('admin.credits.transactions.columns.reason') },
  { accessorKey: 'amount', header: t('admin.credits.transactions.columns.amount') },
  { accessorKey: 'balanceAfter', header: t('admin.credits.transactions.columns.balance') },
  { accessorKey: 'operatorName', header: t('admin.credits.transactions.columns.operator') },
  { accessorKey: 'remark', header: t('admin.credits.transactions.columns.remark') }
])

function amountClass(amt: number) {
  const color = amt > 0 ? 'text-success' : amt < 0 ? 'text-error' : 'text-muted'
  return `tabular-nums font-semibold ${color}`
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            {{ $t('admin.credits.transactions.title') }}
          </h2>
          <p class="mt-1 text-sm text-toned">
            {{ $t('admin.credits.transactions.description') }}
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        :title="$t('admin.credits.transactions.filterTitle')"
        panel-class="w-[calc(100vw-2rem)] max-w-2xl p-3"
        @apply="apply"
        @reset="reset"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField :label="$t('admin.credits.transactions.filters.userId')">
            <UInput
              v-model.number="filters.userId"
              type="number"
              min="1"
              :placeholder="$t('admin.credits.transactions.filters.emptyAll')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.reason')">
            <USelect
              v-model="filters.reason"
              :items="reasonItems"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.direction')">
            <USelect
              v-model="filters.direction"
              :items="directionItems"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.operator')">
            <UInput
              v-model="filters.operatorName"
              :placeholder="$t('admin.credits.transactions.filters.operatorPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.startAt')">
            <UInput
              v-model="filters.startAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.endAt')">
            <UInput
              v-model="filters.endAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.minAmount')">
            <UInput
              v-model.number="filters.minAmount"
              type="number"
              :placeholder="$t('admin.credits.transactions.filters.minAmountPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.transactions.filters.maxAmount')">
            <UInput
              v-model.number="filters.maxAmount"
              type="number"
              :placeholder="$t('admin.credits.transactions.filters.maxAmountPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>
      </AdminFilterPopover>
      <UButton
        class="ml-auto"
        icon="i-mdi-refresh"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
    </div>

    <DashboardTableCard
      :title="$t('admin.credits.transactions.detailsTitle')"
      icon="i-mdi-cash-multiple"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :empty-title="$t('admin.credits.transactions.empty')"
        empty-icon="i-mdi-cash-multiple"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span>{{ row.original.userName || '-' }}</span>
            <span class="text-muted">
              {{ row.original.userRole === 'admin'
                ? $t('common.identities.adminWithId', { id: row.original.userId })
                : $t('common.identities.userWithId', { id: row.original.userId }) }}
            </span>
          </div>
        </template>
        <template #reason-cell="{ row }">
          <UBadge
            :color="getReasonColor(row.original.reason)"
            variant="subtle"
          >
            {{ getReasonLabel(row.original.reason) }}
          </UBadge>
        </template>
        <template #amount-cell="{ row }">
          <span :class="amountClass(row.original.amount)">
            {{ row.original.amount > 0 ? '+' : '' }}{{ row.original.amount.toLocaleString(locale) }}
          </span>
        </template>
        <template #balanceAfter-cell="{ row }">
          <span class="tabular-nums text-xs text-muted">{{ row.original.balanceAfter.toLocaleString(locale) }}</span>
        </template>
        <template #operatorName-cell="{ row }">
          <div
            v-if="row.original.operatorId"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.operatorName || '-' }}</span>
            <span class="text-muted">{{ $t('common.identities.adminWithId', { id: row.original.operatorId }) }}</span>
          </div>
          <div
            v-else-if="row.original.operatorName"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.operatorName }}</span>
            <span class="text-muted">{{ $t('common.identities.admin') }}</span>
          </div>
          <span
            v-else
            class="text-xs text-muted italic"
          >{{ $t('common.identities.system') }}</span>
        </template>
        <template #remark-cell="{ row }">
          <span class="text-xs text-muted truncate max-w-[260px] block">{{ row.original.remark || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
  </div>
</template>
