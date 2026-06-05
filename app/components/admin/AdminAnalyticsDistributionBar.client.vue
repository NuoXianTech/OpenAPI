<script setup lang="ts">
import type { AdminAnalyticsDistributionItem } from '~~/shared/types/admin-logs'

// @unovis（d3 + DOM）体积较大：改为 client-only 异步组件，拆成独立 chunk，不进 admin 首屏 bundle。
const VisXYContainer = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisXYContainer))
const VisStackedBar = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisStackedBar))
const VisAxis = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisAxis))
const VisCrosshair = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisCrosshair))
const VisTooltip = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisTooltip))

interface Props {
  distribution: AdminAnalyticsDistributionItem[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface BarRow {
  index: number
  name: string
  apiPath: string
  successCalls: number
  failureCalls: number
  totalCalls: number
}

const rows = computed<BarRow[]>(() => props.distribution.map((item, index) => ({
  index,
  name: item.name,
  apiPath: item.apiPath,
  successCalls: item.successCalls,
  failureCalls: item.failureCalls,
  totalCalls: item.totalCalls
})))

const x = (_d: BarRow, i: number) => i
const successAccessor = (d: BarRow) => d.successCalls
const failureAccessor = (d: BarRow) => d.failureCalls

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick !== 'number') return ''
  const item = rows.value[Math.round(tick)]
  if (!item) return ''
  return item.name.length > 8 ? `${item.name.slice(0, 8)}…` : item.name
}

const yTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') return ''
  return Math.round(tick).toString()
}

const tooltipTemplate = (d: BarRow) => `
  <div style="font-size:12px;line-height:1.6">
    <div style="font-weight:600;margin-bottom:4px">${d.name}</div>
    <div style="color:var(--ui-text-muted);font-family:ui-monospace,Menlo,monospace;font-size:11px">${d.apiPath}</div>
    <div>总调用：${d.totalCalls.toLocaleString()}</div>
    <div>成功：${d.successCalls.toLocaleString()}</div>
    <div>失败：${d.failureCalls.toLocaleString()}</div>
  </div>
`
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
  >
    <UEmpty
      v-if="rows.length === 0"
      icon="i-mdi-chart-bar"
      title="暂无启用接口"
      description="请先在「接口管理」中启用接口并开启统计"
      class="h-72"
    />

    <VisXYContainer
      v-else
      :data="rows"
      :padding="{ top: 16, right: 16, bottom: 24, left: 8 }"
      :width="width"
      class="h-72"
    >
      <VisStackedBar
        :x="x"
        :y="[successAccessor, failureAccessor]"
        :color="['var(--ui-success)', 'var(--ui-error)']"
        :bar-padding="0.2"
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

    <div
      v-if="rows.length > 0"
      class="mt-3 flex flex-wrap gap-4 text-xs text-muted"
    >
      <span class="inline-flex items-center gap-1.5">
        <span class="legend-dot legend-dot--success" />
        成功
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="legend-dot legend-dot--error" />
        失败
      </span>
    </div>
  </div>
</template>

<style scoped>
.legend-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  display: inline-block;
}
.legend-dot--success { background: var(--ui-success); }
.legend-dot--error { background: var(--ui-error); }
</style>
