<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminAnalyticsDistributionItem } from '~~/shared/types/admin-logs'

interface Props {
  distribution: AdminAnalyticsDistributionItem[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface AreaRow {
  index: number
  name: string
  apiPath: string
  totalCalls: number
}

const rows = computed<AreaRow[]>(() => props.distribution.map((item, index) => ({
  index,
  name: item.name,
  apiPath: item.apiPath,
  totalCalls: item.totalCalls
})))

const x = (_d: AreaRow, i: number) => i
const yAccessor = (d: AreaRow) => d.totalCalls

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

const tooltipTemplate = (d: AreaRow) => `
  <div style="font-size:12px;line-height:1.6">
    <div style="font-weight:600;margin-bottom:4px">${d.name}</div>
    <div style="color:#888;font-family:ui-monospace,Menlo,monospace;font-size:11px">${d.apiPath}</div>
    <div>总调用：${d.totalCalls.toLocaleString()}</div>
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
      icon="i-mdi-chart-areaspline"
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
      <VisArea
        :x="x"
        :y="yAccessor"
        color="var(--ui-primary)"
        :opacity="0.18"
      />
      <VisLine
        :x="x"
        :y="yAccessor"
        color="var(--ui-primary)"
        :line-width="2.4"
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
