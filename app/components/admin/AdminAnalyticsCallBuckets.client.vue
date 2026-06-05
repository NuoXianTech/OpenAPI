<script setup lang="ts">
import type { AdminAnalyticsCallBucket } from '~~/shared/types/admin-logs'

// @unovis（d3 + DOM）体积较大：改为 client-only 异步组件，拆成独立 chunk，不进 admin 首屏 bundle。
const VisXYContainer = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisXYContainer))
const VisGroupedBar = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisGroupedBar))
const VisAxis = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisAxis))
const VisCrosshair = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisCrosshair))
const VisTooltip = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisTooltip))

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

const tooltipTemplate = (d: BucketRow) => `
  <div style="font-size:12px;line-height:1.6">
    <div style="font-weight:600;margin-bottom:4px">调用区间 ${d.label}</div>
    <div>接口数：${d.apiCount}</div>
  </div>
`
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
