<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminAnalyticsHourlyPoint } from '~~/shared/types/admin-logs'

interface Props {
  trend: AdminAnalyticsHourlyPoint[]
}

const props = defineProps<Props>()

const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface TrendRow {
  index: number
  label: string
  hour: string
  totalCalls: number
}

const rows = computed<TrendRow[]>(() => props.trend.map((p, index) => ({
  index,
  label: p.label,
  hour: p.hour,
  totalCalls: p.totalCalls
})))

const hasData = computed(() => rows.value.some(r => r.totalCalls > 0))

const x = (_d: TrendRow, i: number) => i
const yAccessor = (d: TrendRow) => d.totalCalls

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick !== 'number') return ''
  const i = Math.round(tick)
  if (i % 4 !== 0) return ''
  return rows.value[i]?.label || ''
}

const yTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') return ''
  return Math.round(tick).toString()
}

const tooltipTemplate = (d: TrendRow) => `
  <div style="font-size:12px;line-height:1.6">
    <div style="font-weight:600;margin-bottom:4px">${d.label}</div>
    <div>调用次数：${d.totalCalls.toLocaleString()}</div>
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
      icon="i-mdi-clock-time-eight-outline"
      title="近 24 小时暂无调用"
      class="h-64"
    />

    <VisXYContainer
      v-else
      :data="rows"
      :padding="{ top: 16, right: 16, bottom: 20, left: 8 }"
      :width="width"
      class="h-64"
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
</template>
