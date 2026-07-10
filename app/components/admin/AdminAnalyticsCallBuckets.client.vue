<script setup lang="ts">
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminAnalyticsCallBucket } from '#shared/types/admin'

// 本组件是 .client.vue（@unovis 的 d3+DOM 不进 admin 首屏 entry）。
// unovis 原语必须静态导入、同步可用——各自 defineAsyncComponent 会让 VisXYContainer 在
// VisAxis 注册前就首绘，导致坐标轴首帧画不出来（须点刷新才补画）。

interface Props {
  buckets: AdminAnalyticsCallBucket[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface BucketRow {
  label: string
  axisLabel: string
  apiCount: number
}

const rows = computed<BucketRow[]>(() => props.buckets.map(b => ({
  label: b.label,
  axisLabel: formatBucketAxisLabel(b.label),
  apiCount: b.apiCount
})))

const hasData = computed(() => rows.value.some(r => r.apiCount > 0))

const x = (_d: BucketRow, i: number) => i
const yAccessor = (d: BucketRow) => d.apiCount
const xTickFormat = createChartIndexedTickFormatter(() => rows.value, row => row.axisLabel)
const yTickFormat = formatChartIntegerTick

function formatBucketAxisLabel(label: string): string {
  if (label === '101-1000') return '101-1k'
  if (label === '>1000') return '>1k'
  return label
}

const tooltipTemplate = (d: BucketRow) => renderChartTooltip({
  title: `调用区间 ${d.label}`,
  rows: [
    { color: 'var(--ui-primary)', label: '接口数', value: d.apiCount.toLocaleString() }
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
      icon="i-mdi-chart-bar"
      title="暂无调用分布"
      class="h-64"
    />

    <VisXYContainer
      v-else
      :data="rows"
      :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
      :width="width"
      class="h-64"
    >
      <VisGroupedBar
        :x="x"
        :y="yAccessor"
        color="var(--ui-primary)"
        :bar-padding="0.3"
        :rounded-corners="3"
      />
      <VisAxis
        type="x"
        :tick-line="false"
        :domain-line="false"
        :grid-line="false"
        :tick-format="xTickFormat"
        :num-ticks="rows.length"
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
        color="var(--ui-primary)"
        :template="tooltipTemplate"
      />
      <VisTooltip />
    </VisXYContainer>
  </div>
</template>
