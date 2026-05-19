<script setup lang="ts">
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminDashboardTrendPoint } from '~~/shared/types/admin-dashboard'

interface Props {
  trend: AdminDashboardTrendPoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

interface TrendRow {
  label: string
  total: number
  success: number
  failure: number
  raw: AdminDashboardTrendPoint
}

const rows = computed<TrendRow[]>(() => props.trend.map(item => ({
  label: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date.slice(5) : item.date,
  total: item.totalCalls,
  success: item.successCalls,
  failure: item.failureCalls,
  raw: item
})))

const formatNumber = (val: number) => val.toLocaleString()

const x = (_: TrendRow, i: number) => i
const totalAccessor = (d: TrendRow) => d.total
const successAccessor = (d: TrendRow) => d.success
const failureAccessor = (d: TrendRow) => d.failure

const xTicks = (i: number) => {
  if (rows.value.length === 0) return ''
  if (i === 0 || i === rows.value.length - 1 || !rows.value[i]) return ''
  if (rows.value.length > 10 && i % Math.ceil(rows.value.length / 6) !== 0) return ''
  return rows.value[i]?.label || ''
}

const yTicks = (tick: number | Date) => typeof tick === 'number' ? Math.round(tick).toString() : ''

const tooltipTemplate = (d: TrendRow) => {
  return `<div style="font-size:12px;line-height:1.6">
    <div style="font-weight:600;margin-bottom:4px">${d.raw.date}</div>
    <div>总调用：${formatNumber(d.total)}</div>
    <div>成功：${formatNumber(d.success)}</div>
    <div>失败：${formatNumber(d.failure)}</div>
  </div>`
}
</script>

<template>
  <div
    ref="cardRef"
    class="relative"
  >
    <div
      v-if="rows.length === 0 && !loading"
      class="flex h-72 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
    >
      暂无调用数据
    </div>

    <VisXYContainer
      v-else
      :data="rows"
      :padding="{ top: 16, right: 16, bottom: 8, left: 8 }"
      :width="width"
      class="h-72"
    >
      <VisArea
        :x="x"
        :y="totalAccessor"
        color="var(--ui-primary)"
        :opacity="0.08"
      />
      <VisLine
        :x="x"
        :y="totalAccessor"
        color="var(--ui-primary)"
        :line-width="2.5"
      />
      <VisLine
        :x="x"
        :y="successAccessor"
        color="var(--ui-success)"
        :line-width="2"
      />
      <VisLine
        :x="x"
        :y="failureAccessor"
        color="var(--ui-error)"
        :line-width="2"
      />
      <VisAxis
        type="x"
        :tick-line="false"
        :domain-line="false"
        :grid-line="false"
        :tick-format="xTicks"
      />
      <VisAxis
        type="y"
        :tick-line="false"
        :domain-line="false"
        :grid-line="true"
        :tick-format="yTicks"
        :num-ticks="4"
      />
      <VisCrosshair
        color="var(--ui-primary)"
        :template="tooltipTemplate"
      />
      <VisTooltip />
    </VisXYContainer>

    <div class="mt-3 flex flex-wrap gap-4 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5">
        <span class="trend-legend-dot trend-legend-dot--primary" />
        总调用
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="trend-legend-dot trend-legend-dot--success" />
        成功
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="trend-legend-dot trend-legend-dot--error" />
        失败
      </span>
    </div>
  </div>
</template>

<style scoped>
.trend-legend-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  display: inline-block;
}
.trend-legend-dot--primary { background: var(--ui-primary); }
.trend-legend-dot--success { background: var(--ui-success); }
.trend-legend-dot--error { background: var(--ui-error); }
</style>
