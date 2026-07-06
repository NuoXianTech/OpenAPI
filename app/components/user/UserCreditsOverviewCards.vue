<script setup lang="ts">
import type { CreditSummary } from '~/composables/user/use-user-credits-page'

const props = defineProps<{
  summary: CreditSummary
}>()

interface CreditOverviewCard {
  key: string
  label: string
  value: string
  unit: string
  meta: string
  icon: string
  tone: 'neutral' | 'info' | 'success' | 'error'
}

const cards = computed<CreditOverviewCard[]>(function getCreditOverviewCards() {
  return [
    {
      key: 'balance',
      label: '当前积分',
      value: props.summary.balance.toLocaleString(),
      unit: '积分',
      meta: '可用于 API 调用',
      icon: 'i-lucide-coins',
      tone: 'neutral'
    },
    {
      key: 'in',
      label: '累计收入',
      value: props.summary.totalIn.toLocaleString(),
      unit: '积分',
      meta: '签到、兑换与后台发放',
      icon: 'i-lucide-circle-arrow-down',
      tone: 'success'
    },
    {
      key: 'out',
      label: '累计支出',
      value: props.summary.totalOut.toLocaleString(),
      unit: '积分',
      meta: 'API 调用扣费合计',
      icon: 'i-lucide-circle-arrow-up',
      tone: 'error'
    },
    {
      key: 'count',
      label: '流水笔数',
      value: props.summary.totalCount.toLocaleString(),
      unit: '笔',
      meta: '全部积分变动记录',
      icon: 'i-lucide-list-ordered',
      tone: 'info'
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
    />
  </div>
</template>
