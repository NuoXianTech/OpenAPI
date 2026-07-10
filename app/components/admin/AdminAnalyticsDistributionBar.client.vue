<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminAnalyticsDistributionItem } from '#shared/types/admin'

// 本组件是 .client.vue（@unovis 的 d3+DOM 不进 admin 首屏 entry）。
// unovis 原语必须静态导入、同步可用——各自 defineAsyncComponent 会让 VisXYContainer 在
// VisAxis 注册前就首绘，导致坐标轴首帧画不出来（须点刷新才补画）。

interface Props {
  distribution: AdminAnalyticsDistributionItem[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface BarRow {
  name: string
  apiPath: string
  successCalls: number
  failureCalls: number
  totalCalls: number
}

const rows = computed<BarRow[]>(() => props.distribution.map(item => ({
  name: item.name,
  apiPath: item.apiPath,
  successCalls: item.successCalls,
  failureCalls: item.failureCalls,
  totalCalls: item.totalCalls
})))

const x = (_d: BarRow, i: number) => i
const successAccessor = (d: BarRow) => d.successCalls
const failureAccessor = (d: BarRow) => d.failureCalls
const xTickFormat = createChartIndexedTickFormatter(
  () => rows.value,
  row => truncateChartAxisLabel(row.name)
)
const yTickFormat = formatChartIntegerTick

const tooltipTemplate = (d: BarRow) => renderChartTooltip({
  title: d.name,
  subtitle: d.apiPath,
  rows: [
    { color: 'var(--ui-success)', label: '成功', value: d.successCalls.toLocaleString() },
    { color: 'var(--ui-error)', label: '失败', value: d.failureCalls.toLocaleString() }
  ],
  footer: [
    { label: '总调用', value: d.totalCalls.toLocaleString() }
  ]
})
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
      :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
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
        :num-ticks="7"
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
      class="mt-4 flex flex-wrap gap-2"
    >
      <UBadge
        variant="soft"
        color="success"
        icon="i-mdi-circle"
        class="rounded-md"
      >
        成功
      </UBadge>
      <UBadge
        variant="soft"
        color="error"
        icon="i-mdi-circle"
        class="rounded-md"
      >
        失败
      </UBadge>
    </div>
  </div>
</template>
