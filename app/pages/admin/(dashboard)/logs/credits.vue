<script setup lang="ts">
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import type { TableColumn } from '@nuxt/ui'
import { creditReasonColor, creditReasonLabel, type CreditReasonFilter } from '#shared/types/credit-reason'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

interface CreditTxnRow {
  id: number
  userId: number
  userName: string | null
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
}

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  applyFilters: apply,
  reset
} = usePrivatePagedList<CreditTxnFilters, CreditTxnRow>({
  path: '/api/admin/users/credits/transactions',
  defaultFilters: { userId: '', reason: 'all' },
  defaultPageSize: DEFAULT_PAGE_SIZE,
  buildQuery: (f, p) => ({
    userId: f.userId || undefined,
    reason: f.reason === 'all' ? undefined : f.reason,
    limit: p.limit,
    offset: p.offset
  })
})

const activeFilterCount = computed(() => [
  filters.userId !== '',
  filters.reason !== 'all'
].filter(Boolean).length)

const reasonItems = [
  { label: '全部原因', value: 'all' },
  { label: '管理员加积分', value: 'admin_grant' },
  { label: '管理员扣积分', value: 'admin_revoke' },
  { label: '管理员重置', value: 'admin_reset' },
  { label: 'API 调用扣费', value: 'api_charge' },
  { label: 'API 调用退款', value: 'api_refund' },
  { label: '注册赠送', value: 'signup_bonus' },
  { label: '兑换码', value: 'redemption_code' }
]

const columns: TableColumn<CreditTxnRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'userId', header: '用户' },
  { accessorKey: 'reason', header: '原因' },
  { accessorKey: 'amount', header: '金额' },
  { accessorKey: 'balanceAfter', header: '余额' },
  { accessorKey: 'operatorName', header: '操作人' },
  { accessorKey: 'remark', header: '备注' }
]

function amountClass(amt: number) {
  const color = amt > 0 ? 'text-success' : amt < 0 ? 'text-error' : 'text-muted'
  return `tabular-nums font-semibold ${color}`
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface dashboard-hero-surface-success relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            积分日志
          </h2>
          <p class="mt-1 text-sm text-toned">
            用户积分变动、扣费退款与后台调整记录
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        title="积分日志筛选"
        @apply="apply"
        @reset="reset"
      >
        <div class="grid gap-3">
          <UFormField label="用户 ID">
            <UInput
              v-model.number="filters.userId"
              type="number"
              placeholder="留空查全部"
              class="w-full"
            />
          </UFormField>
          <UFormField label="原因">
            <USelect
              v-model="filters.reason"
              :items="reasonItems"
              class="w-full"
            />
          </UFormField>
        </div>
      </AdminFilterPopover>
    </div>

    <DashboardTableCard
      title="积分明细"
      icon="i-mdi-cash-multiple"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        empty-title="暂无积分日志"
        empty-icon="i-mdi-cash-multiple"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span>{{ row.original.userName || '-' }}</span>
            <span class="text-muted">{{ formatUserIdentity(row.original.userId) }}</span>
          </div>
        </template>
        <template #reason-cell="{ row }">
          <UBadge
            :color="creditReasonColor(row.original.reason)"
            variant="subtle"
          >
            {{ creditReasonLabel(row.original.reason) }}
          </UBadge>
        </template>
        <template #amount-cell="{ row }">
          <span :class="amountClass(row.original.amount)">
            {{ row.original.amount > 0 ? '+' : '' }}{{ row.original.amount.toLocaleString() }}
          </span>
        </template>
        <template #balanceAfter-cell="{ row }">
          <span class="tabular-nums text-xs text-muted">{{ row.original.balanceAfter.toLocaleString() }}</span>
        </template>
        <template #operatorName-cell="{ row }">
          <div
            v-if="row.original.operatorId"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.operatorName || '-' }}</span>
            <span class="text-muted">{{ formatAdminIdentity(row.original.operatorId) }}</span>
          </div>
          <div
            v-else-if="row.original.operatorName"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.operatorName }}</span>
            <span class="text-muted">管理员</span>
          </div>
          <span
            v-else
            class="text-xs text-muted italic"
          >系统</span>
        </template>
        <template #remark-cell="{ row }">
          <span class="text-xs text-muted truncate max-w-[260px] block">{{ row.original.remark || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
  </div>
</template>
