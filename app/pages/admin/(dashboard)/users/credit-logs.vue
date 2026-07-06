<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { creditReasonColor, creditReasonLabel, type CreditReasonFilter } from '~/types/credit-reason'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

interface CreditTxnRow {
  id: number
  userId: number
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

    <UCard
      variant="subtle"
      :ui="{ body: 'p-4 sm:p-5' }"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-funnel"
              class="size-4 text-muted"
            />
            <h3 class="text-sm font-semibold text-highlighted">
              筛选条件
            </h3>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ activeFilterCount ? `${activeFilterCount} 项筛选` : '未筛选' }}
          </UBadge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
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
          <div class="flex gap-2 md:col-span-2 xl:col-span-1">
            <UButton
              icon="i-lucide-search"
              @click="apply"
            >
              查询
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              @click="reset"
            >
              重置
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <DashboardTableCard
      title="积分明细"
      icon="i-lucide-coins"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        :data="items"
        :columns="columns"
        :loading="loading"
        :page-size="pageSize"
        :total="total"
        empty-title="暂无积分日志"
        empty-icon="i-lucide-coins"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <span class="font-mono text-xs">#{{ row.original.userId }}</span>
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
          <span
            v-if="row.original.operatorName"
            class="text-xs"
          >{{ row.original.operatorName }}</span>
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
