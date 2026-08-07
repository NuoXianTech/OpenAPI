<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminCreditOverview,
  AdminCreditRecentTransaction
} from '#shared/types/admin-credits'
import { useCreditReasonMeta } from '~/composables/credits/use-credit-reason-meta'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { DashboardMetricTone } from '~/types/dashboard-metric'
import {
  ADMIN_CREDIT_TRANSACTIONS_PATH,
  ADMIN_CREDIT_USERS_PATH,
  ADMIN_REDEMPTION_CODES_PATH
} from '~/constants/dashboard-sections'

const { t, locale } = useI18n()
const { getReasonColor, getReasonLabel } = useCreditReasonMeta()
useHead({ title: () => t('admin.credits.overview.pageTitle') })

interface OverviewCard {
  key: string
  label: string
  value: string
  icon: string
  meta: string
  tone: DashboardMetricTone
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
  label: t('admin.credits.overview.cards.totalBalance'),
  value: overview.value.summary.totalBalance.toLocaleString(locale.value),
  icon: 'i-mdi-wallet-outline',
  meta: t('admin.credits.overview.cards.usersWithBalance', {
    count: overview.value.summary.usersWithBalance.toLocaleString(locale.value)
  }),
  tone: 'ink'
}, {
  key: 'income',
  label: t('admin.credits.overview.cards.income24h'),
  value: overview.value.summary.income24h.toLocaleString(locale.value),
  icon: 'i-mdi-trending-up',
  meta: t('admin.credits.overview.cards.transactionCount24h', {
    count: overview.value.summary.transactionCount24h.toLocaleString(locale.value)
  }),
  tone: 'blue'
}, {
  key: 'expense',
  label: t('admin.credits.overview.cards.expense24h'),
  value: overview.value.summary.expense24h.toLocaleString(locale.value),
  icon: 'i-mdi-trending-down',
  meta: t('admin.credits.overview.cards.netChange24h', {
    amount: `${overview.value.summary.netChange24h >= 0 ? '+' : ''}${overview.value.summary.netChange24h.toLocaleString(locale.value)}`
  }),
  tone: 'rose'
}, {
  key: 'average',
  label: t('admin.credits.overview.cards.averageBalance'),
  value: overview.value.summary.averageBalance.toLocaleString(locale.value),
  icon: 'i-mdi-chart-donut',
  meta: t('admin.credits.overview.cards.userCount', {
    count: overview.value.summary.userCount.toLocaleString(locale.value)
  }),
  tone: 'violet'
}, {
  key: 'codes',
  label: t('admin.credits.overview.cards.activeRedemptionCodes'),
  value: overview.value.summary.activeRedemptionCodes.toLocaleString(locale.value),
  icon: 'i-mdi-ticket-percent-outline',
  meta: t('admin.credits.overview.cards.redemptionPotential', {
    amount: overview.value.summary.redemptionPotential.toLocaleString(locale.value)
  }),
  tone: 'bronze'
}])

const columns = computed<TableColumn<AdminCreditRecentTransaction>[]>(() => [
  { accessorKey: 'createdAt', header: t('admin.credits.overview.columns.time') },
  { accessorKey: 'userId', header: t('admin.credits.overview.columns.user') },
  { accessorKey: 'reason', header: t('admin.credits.overview.columns.reason') },
  { accessorKey: 'amount', header: t('admin.credits.overview.columns.change') },
  { accessorKey: 'balanceAfter', header: t('admin.credits.overview.columns.balance') },
  { accessorKey: 'remark', header: t('admin.credits.overview.columns.remark') }
])

const generatedAtLabel = computed(() => overview.value.generatedAt
  ? formatDateTime(overview.value.generatedAt, '-', locale.value)
  : t('admin.credits.overview.waitingRefresh'))

function amountClass(amount: number): string {
  return amount > 0
    ? 'font-semibold tabular-nums text-success'
    : amount < 0
      ? 'font-semibold tabular-nums text-error'
      : 'font-semibold tabular-nums text-muted'
}

function formatCreditUserIdentity(transaction: AdminCreditRecentTransaction): string {
  if (!transaction.userId) return '-'

  return transaction.userRole === 'admin'
    ? t('common.identities.adminWithId', { id: transaction.userId })
    : t('common.identities.userWithId', { id: transaction.userId })
}
</script>

<template>
  <div class="space-y-6">
    <DashboardPageIntro
      surface
      :title="$t('admin.credits.overview.title')"
      :description="$t('admin.credits.overview.description')"
    >
      <template #actions>
        <UButton
          :to="ADMIN_CREDIT_USERS_PATH"
          icon="i-mdi-account-cash-outline"
          color="neutral"
          variant="outline"
        >
          {{ $t('admin.credits.overview.actions.userCredits') }}
        </UButton>
        <UButton
          :to="ADMIN_REDEMPTION_CODES_PATH"
          icon="i-mdi-ticket-percent-outline"
        >
          {{ $t('admin.credits.overview.actions.redemptionCodes') }}
        </UButton>
      </template>
    </DashboardPageIntro>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted">
        {{ $t('admin.credits.overview.updatedAt', { time: generatedAtLabel }) }}
      </p>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-mdi-alert-circle-outline"
      :title="$t('admin.credits.overview.loadFailed')"
      :description="$t('admin.credits.overview.loadFailedDescription')"
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
      :title="$t('admin.credits.overview.recentTitle')"
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
          {{ $t('admin.credits.overview.actions.viewAll') }}
        </UButton>
      </template>

      <DashboardDataTable
        :data="overview.recentTransactions"
        :columns="columns"
        :loading="loading"
        :fixed="false"
      >
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-xs text-muted">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span>{{ row.original.userName || $t('common.accounts.deletedUser') }}</span>
            <span class="text-muted">{{ formatCreditUserIdentity(row.original) }}</span>
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
          <span class="tabular-nums text-sm">{{ row.original.balanceAfter.toLocaleString(locale) }}</span>
        </template>
        <template #remark-cell="{ row }">
          <span class="block max-w-64 truncate text-xs text-muted">{{ row.original.remark || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
  </div>
</template>
