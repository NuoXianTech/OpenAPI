<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminCreditOverview,
  AdminCreditRecentTransaction
} from '#shared/types/admin-credits'
import { creditReasonColor, creditReasonLabel } from '#shared/types/credit-reason'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import {
  ADMIN_CREDIT_TRANSACTIONS_PATH,
  ADMIN_CREDIT_USERS_PATH,
  ADMIN_REDEMPTION_CODES_PATH
} from '~/constants/dashboard-sections'

useHead({ title: '积分概览' })

interface OverviewCard {
  key: string
  label: string
  value: string
  icon: string
  meta: string
  tone: 'primary' | 'neutral' | 'info' | 'warning' | 'success' | 'error'
}

function createEmptyOverview(): AdminCreditOverview {
  return {
    generatedAt: '',
    summary: {
      totalBalance: 0,
      userCount: 0,
      usersWithBalance: 0,
      averageBalance: 0,
      income24h: 0,
      expense24h: 0,
      netChange24h: 0,
      transactionCount24h: 0,
      activeRedemptionCodes: 0,
      redemptionPotential: 0
    },
    recentTransactions: []
  }
}

const { data: overview, loading, error, refresh } = usePrivateResource<AdminCreditOverview>({
  path: '/api/admin/credits/overview',
  defaultData: createEmptyOverview
})

const overviewCards = computed<OverviewCard[]>(() => [{
  key: 'balance',
  label: '用户积分总余额',
  value: overview.value.summary.totalBalance.toLocaleString(),
  icon: 'i-mdi-wallet-outline',
  meta: `${overview.value.summary.usersWithBalance.toLocaleString()} 位用户持有积分`,
  tone: 'primary'
}, {
  key: 'income',
  label: '近 24 小时发放',
  value: overview.value.summary.income24h.toLocaleString(),
  icon: 'i-mdi-trending-up',
  meta: `共 ${overview.value.summary.transactionCount24h.toLocaleString()} 笔变动`,
  tone: 'success'
}, {
  key: 'expense',
  label: '近 24 小时消耗',
  value: overview.value.summary.expense24h.toLocaleString(),
  icon: 'i-mdi-trending-down',
  meta: `净变化 ${overview.value.summary.netChange24h >= 0 ? '+' : ''}${overview.value.summary.netChange24h.toLocaleString()}`,
  tone: 'error'
}, {
  key: 'average',
  label: '用户平均余额',
  value: overview.value.summary.averageBalance.toLocaleString(),
  icon: 'i-mdi-chart-donut',
  meta: `共 ${overview.value.summary.userCount.toLocaleString()} 位用户`,
  tone: 'info'
}, {
  key: 'codes',
  label: '可用兑换码',
  value: overview.value.summary.activeRedemptionCodes.toLocaleString(),
  icon: 'i-mdi-ticket-percent-outline',
  meta: `最多可发放 ${overview.value.summary.redemptionPotential.toLocaleString()} 积分`,
  tone: 'warning'
}])

const columns: TableColumn<AdminCreditRecentTransaction>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'userId', header: '用户' },
  { accessorKey: 'reason', header: '原因' },
  { accessorKey: 'amount', header: '变动' },
  { accessorKey: 'balanceAfter', header: '余额' },
  { accessorKey: 'remark', header: '备注' }
]

const generatedAtLabel = computed(() => overview.value.generatedAt
  ? formatDateTime(overview.value.generatedAt)
  : '等待刷新')

function amountClass(amount: number): string {
  return amount > 0
    ? 'font-semibold tabular-nums text-success'
    : amount < 0
      ? 'font-semibold tabular-nums text-error'
      : 'font-semibold tabular-nums text-muted'
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface dashboard-hero-surface-success relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            积分运营概览
          </h2>
          <p class="mt-1 text-sm text-toned">
            汇总用户余额、近期收支和兑换码发放能力
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            :to="ADMIN_CREDIT_USERS_PATH"
            icon="i-mdi-account-cash-outline"
            color="neutral"
            variant="outline"
          >
            用户积分
          </UButton>
          <UButton
            :to="ADMIN_REDEMPTION_CODES_PATH"
            icon="i-mdi-ticket-percent-outline"
          >
            兑换码管理
          </UButton>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted">
        更新于 {{ generatedAtLabel }}
      </p>
      <UButton
        icon="i-mdi-refresh"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        刷新
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-mdi-alert-circle-outline"
      title="积分概览加载失败"
      description="请稍后刷新重试。"
    />

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardMetricCard
        v-for="card in overviewCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :meta="card.meta"
        :tone="card.tone"
        compact
      />
    </div>

    <DashboardTableCard
      title="最近积分变动"
      icon="i-mdi-history"
      :total="overview.recentTransactions.length"
    >
      <template #actions>
        <UButton
          :to="ADMIN_CREDIT_TRANSACTIONS_PATH"
          color="neutral"
          variant="ghost"
          trailing-icon="i-mdi-arrow-right"
        >
          查看全部
        </UButton>
      </template>

      <UTable
        :data="overview.recentTransactions"
        :columns="columns"
        :loading="loading"
      >
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-xs text-muted">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span>{{ row.original.userName || '已删除用户' }}</span>
            <span class="text-muted">{{ row.original.userId ? formatUserIdentity(row.original.userId) : '-' }}</span>
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
          <span class="tabular-nums text-sm">{{ row.original.balanceAfter.toLocaleString() }}</span>
        </template>
        <template #remark-cell="{ row }">
          <span class="block max-w-64 truncate text-xs text-muted">{{ row.original.remark || '-' }}</span>
        </template>
      </UTable>
    </DashboardTableCard>
  </div>
</template>
