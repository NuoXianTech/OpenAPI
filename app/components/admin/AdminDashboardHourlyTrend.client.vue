<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminDashboardHourlyPoint } from '#shared/types/admin'

// 本组件是 .client.vue（@unovis 的 d3+DOM 不进 admin 首屏 entry）。
// unovis 原语必须静态导入、同步可用——各自 defineAsyncComponent 会让 VisXYContainer 在
// VisAxis 注册前就首绘，导致坐标轴首帧画不出来（须点刷新才补画）。

interface Props {
  trend: AdminDashboardHourlyPoint[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

const MINIMUM_CHART_WIDTH = 960
const chartWidth = computed(() => Math.max(width.value, MINIMUM_CHART_WIDTH))

interface TrendRow {
  label: string
  hour: string
  totalCalls: number
}

const rows = computed<TrendRow[]>(() => props.trend.map(p => ({
  label: p.label,
  hour: p.hour,
  totalCalls: p.totalCalls
})))

const hasData = computed(() => rows.value.some(r => r.totalCalls > 0))

const x = (_d: TrendRow, i: number) => i
const yAccessor = (d: TrendRow) => d.totalCalls
const xTickValues = computed(() => rows.value.map((_row, index) => index))
const xTickFormat = createChartIndexedTickFormatter(() => rows.value, row => row.label)
const yTickFormat = formatChartIntegerTick

const tooltipTemplate = (d: TrendRow) => renderChartTooltip({
  title: d.label,
  rows: [
    { color: 'var(--ui-info)', label: '调用次数', value: d.totalCalls.toLocaleString() }
  ]
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
  >
    <UEmpty
      v-if="!hasData"
      icon="i-mdi-clock-time-eight-outline"
      title="近 24 小时暂无调用"
      class="h-64"
    />

    <div
      v-else
      class="overflow-x-auto"
    >
      <VisXYContainer
        :data="rows"
        :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
        :width="chartWidth"
        class="h-64 min-w-[960px]"
      >
        <VisArea
          :x="x"
          :y="yAccessor"
          color="var(--ui-info)"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="yAccessor"
          color="var(--ui-info)"
          :line-width="2.2"
        />
        <VisAxis
          type="x"
          :tick-line="false"
          :domain-line="false"
          :grid-line="false"
          :tick-format="xTickFormat"
          :tick-values="xTickValues"
        />
        <VisAxis
          type="y"
          :tick-line="false"
          :domain-line="false"
          :grid-line="true"
          :tick-format="yTickFormat"
          :num-ticks="4"
        />
        <VisCrosshair
          color="var(--ui-info)"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>
    </div>
  </div>
</template>
