<script setup lang="ts">
import type { CreditSummary } from '~/composables/user/use-user-credits-page'
import type { DashboardMetricTone } from '~/types/dashboard-metric'

const props = defineProps<{
  summary: CreditSummary
}>()
const { t, locale } = useI18n()

interface CreditOverviewCard {
  key: string
  label: string
  value: string
  unit: string
  meta: string
  icon: string
  tone: DashboardMetricTone
}

const cards = computed<CreditOverviewCard[]>(function getCreditOverviewCards() {
  return [
    {
      key: 'balance',
      label: t('user.credits.overview.balance'),
      value: props.summary.balance.toLocaleString(locale.value),
      unit: t('common.units.points'),
      meta: t('user.credits.overview.balanceDescription'),
      icon: 'i-mdi-cash-multiple',
      tone: 'ink'
    },
    {
      key: 'in',
      label: t('user.credits.overview.totalIncome'),
      value: props.summary.totalIn.toLocaleString(locale.value),
      unit: t('common.units.points'),
      meta: t('user.credits.overview.totalIncomeDescription'),
      icon: 'i-mdi-arrow-down-bold-circle-outline',
      tone: 'blue'
    },
    {
      key: 'out',
      label: t('user.credits.overview.totalExpenses'),
      value: props.summary.totalOut.toLocaleString(locale.value),
      unit: t('common.units.points'),
      meta: t('user.credits.overview.totalExpensesDescription'),
      icon: 'i-mdi-arrow-up-bold-circle-outline',
      tone: 'rose'
    },
    {
      key: 'count',
      label: t('user.credits.overview.transactionCount'),
      value: props.summary.totalCount.toLocaleString(locale.value),
      unit: t('common.units.records'),
      meta: t('user.credits.overview.transactionCountDescription'),
      icon: 'i-mdi-format-list-numbered',
      tone: 'violet'
    }
  ]
})
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <DashboardMetricCard
      v-for="card in cards"
      :key="card.key"
      :label="card.label"
      :value="card.value"
      :unit="card.unit"
      :meta="card.meta"
      :icon="card.icon"
      :tone="card.tone"
      compact
    />
  </div>
</template>
