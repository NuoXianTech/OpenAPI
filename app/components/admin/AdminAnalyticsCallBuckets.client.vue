<script setup lang="ts">
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminAnalyticsCallBucket } from '~~/shared/types/admin-analytics'

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
  index: number
  label: string
  apiCount: number
}

const rows = computed<BucketRow[]>(() => props.buckets.map((b, index) => ({
  index,
  label: b.label,
  apiCount: b.apiCount
})))

const hasData = computed(() => rows.value.some(r => r.apiCount > 0))

const x = (_d: BucketRow, i: number) => i
const yAccessor = (d: BucketRow) => d.apiCount

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick !== 'number') return ''
  return rows.value[Math.round(tick)]?.label || ''
}

const yTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') return ''
  return Math.round(tick).toString()
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
      :padding="{ top: 16, right: 16, bottom: 24, left: 8 }"
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
