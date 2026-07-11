<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { UserCreditConsumptionDailyRow } from '#shared/types/user-credits'

interface UserCreditsConsumptionTableProps {
  rows: UserCreditConsumptionDailyRow[]
  loading?: boolean
}

withDefaults(defineProps<UserCreditsConsumptionTableProps>(), {
  loading: false
})

const columns: TableColumn<UserCreditConsumptionDailyRow>[] = [
  { accessorKey: 'date', header: '日期' },
  { accessorKey: 'consumedCredits', header: '消耗积分' },
  { accessorKey: 'transactionCount', header: '消耗次数' },
  { id: 'averageConsumption', header: '单次平均消耗' }
]

function formatConsumptionDate(date: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).format(new Date(`${date}T00:00:00`))
}

function getAverageConsumption(row: UserCreditConsumptionDailyRow): number {
  if (row.transactionCount === 0) return 0
  return row.consumedCredits / row.transactionCount
}
</script>

<template>
  <DashboardTableCard
    title="近 7 天积分消耗"
    description="按自然日统计全部负向积分变动，无消耗日期以 0 补齐"
    icon="i-mdi-chart-timeline-variant"
  >
    <DashboardDataTable
      :data="rows"
      :columns="columns"
      :loading="loading"
      :skeleton-rows="7"
      empty-title="暂无积分消耗数据"
      empty-description="最近 7 天还没有发生积分消耗"
      empty-icon="i-mdi-chart-timeline-variant"
    >
      <template #date-cell="{ row }">
        <div class="flex flex-col">
          <span class="font-medium text-highlighted">
            {{ formatConsumptionDate(row.original.date) }}
          </span>
          <span class="text-xs text-muted tabular-nums">
            {{ row.original.date }}
          </span>
        </div>
      </template>

      <template #consumedCredits-cell="{ row }">
        <span class="font-semibold text-error tabular-nums">
          {{ row.original.consumedCredits.toLocaleString() }}
        </span>
      </template>

      <template #transactionCount-cell="{ row }">
        <span class="tabular-nums">
          {{ row.original.transactionCount.toLocaleString() }} 笔
        </span>
      </template>

      <template #averageConsumption-cell="{ row }">
        <span class="tabular-nums text-muted">
          {{ getAverageConsumption(row.original).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }}
        </span>
      </template>
    </DashboardDataTable>
  </DashboardTableCard>
</template>
