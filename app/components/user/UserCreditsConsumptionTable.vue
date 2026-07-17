<script setup lang="ts">
import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { UserCreditConsumptionDailyRow } from '#shared/types/user-credits'

interface UserCreditsConsumptionTableProps {
  rows: UserCreditConsumptionDailyRow[]
  loading?: boolean
}

const props = withDefaults(defineProps<UserCreditsConsumptionTableProps>(), { loading: false })
const { t, locale } = useI18n()
const chartRef = useTemplateRef<HTMLElement | null>('chartRef')
const { width } = useElementSize(chartRef)

interface TrendRow extends UserCreditConsumptionDailyRow {
  label: string
  fullLabel: string
}

const rows = computed<TrendRow[]>(() => props.rows.map(row => ({
  ...row,
  label: new Intl.DateTimeFormat(locale.value, { month: '2-digit', day: '2-digit' }).format(new Date(`${row.date}T00:00:00`)),
  fullLabel: new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${row.date}T00:00:00`))
})))

const x = (_row: TrendRow, index: number) => index
const consumedAccessor = (row: TrendRow) => row.consumedCredits
const xTickFormat = createChartIndexedTickFormatter(() => rows.value, row => row.label)
const tooltipTemplate = (row: TrendRow | undefined) => row
  ? renderChartTooltip({
      title: row.fullLabel,
      rows: [
        { color: 'var(--ui-error)', label: t('user.credits.consumption.consumedPoints'), value: row.consumedCredits.toLocaleString(locale.value) },
        { color: 'var(--ui-primary)', label: t('user.credits.consumption.transactionCount'), value: row.transactionCount.toLocaleString(locale.value) }
      ],
      footer: [{ label: t('user.credits.consumption.averagePerTransaction'), value: row.transactionCount ? (row.consumedCredits / row.transactionCount).toLocaleString(locale.value, { maximumFractionDigits: 2 }) : '0' }]
    })
  : ''
</script>

<template>
  <DashboardTableCard
    :title="$t('user.credits.consumption.title')"
    :description="$t('user.credits.consumption.description')"
    icon="i-mdi-chart-timeline-variant"
  >
    <div
      ref="chartRef"
      class="relative rounded-lg border border-default p-3 sm:p-4"
    >
      <div
        v-if="rows.length === 0 && !loading"
        class="flex h-72 items-center justify-center text-sm text-muted"
      >
        {{ $t('user.credits.consumption.empty') }}
      </div>
      <template v-else>
        <VisXYContainer
          :data="rows"
          :width="width"
          :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
          class="h-72"
        >
          <VisArea
            :x="x"
            :y="consumedAccessor"
            color="var(--ui-error)"
            :opacity="0.1"
          />
          <VisLine
            :x="x"
            :y="consumedAccessor"
            color="var(--ui-error)"
            :line-width="2.5"
          />
          <VisAxis
            type="y"
            :tick-line="false"
            :domain-line="false"
            :grid-line="true"
            :tick-format="formatChartIntegerTick"
            :num-ticks="4"
          />
          <VisAxis
            type="x"
            :tick-line="false"
            :domain-line="false"
            :grid-line="false"
            :tick-format="xTickFormat"
            :num-ticks="7"
          />
          <VisCrosshair
            :x="x"
            :y="[consumedAccessor]"
            :color="['var(--ui-error)']"
            :template="tooltipTemplate"
          />
          <VisTooltip />
        </VisXYContainer>
        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge
            variant="soft"
            color="error"
            icon="i-mdi-circle"
            class="rounded-md"
          >
            {{ $t('user.credits.consumption.consumedPoints') }}
          </UBadge>
        </div>
      </template>
    </div>
  </DashboardTableCard>
</template>
