<script setup lang="ts">
import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { UserDashboardHourlyPoint } from '#shared/types/user-dashboard'

interface Props {
  trend: UserDashboardHourlyPoint[]
}

const props = defineProps<Props>()
const { t, locale } = useI18n()
const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

const MINIMUM_CHART_WIDTH = 720
const chartWidth = computed(() => Math.max(width.value, MINIMUM_CHART_WIDTH))
const hasData = computed(() => props.trend.some(point => point.successCalls > 0 || point.failureCalls > 0))
const xTickValues = computed(() => props.trend.map((_point, index) => index))
const xTickFormat = createChartIndexedTickFormatter(() => props.trend, point => point.label)
const xAccessor = (_point: UserDashboardHourlyPoint, index: number) => index
const successAccessor = (point: UserDashboardHourlyPoint) => point.successCalls
const failureAccessor = (point: UserDashboardHourlyPoint) => point.failureCalls

function tooltipTemplate(point: UserDashboardHourlyPoint): string {
  return renderChartTooltip({
    title: point.label,
    rows: [
      { color: 'var(--ui-success)', label: t('user.overview.chart.successRequests'), value: point.successCalls.toLocaleString(locale.value) },
      { color: 'var(--ui-error)', label: t('user.overview.chart.failureRequests'), value: point.failureCalls.toLocaleString(locale.value) }
    ]
  })
}
</script>

<template>
  <div ref="rootRef" class="relative">
    <UEmpty
      v-if="!hasData"
      icon="i-mdi-chart-timeline-variant-shimmer"
      :title="$t('user.overview.chart.emptyTitle')"
      :description="$t('user.overview.chart.emptyDescription')"
      class="h-64"
    />

    <div v-else class="overflow-x-auto">
      <VisXYContainer
        :data="trend"
        :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
        :width="chartWidth"
        class="h-64 min-w-[720px]"
      >
        <VisArea
          :x="xAccessor"
          :y="successAccessor"
          color="var(--ui-success)"
          :opacity="0.1"
        />
        <VisLine
          :x="xAccessor"
          :y="successAccessor"
          color="var(--ui-success)"
          :line-width="2.2"
        />
        <VisLine
          :x="xAccessor"
          :y="failureAccessor"
          color="var(--ui-error)"
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
          :tick-format="formatChartIntegerTick"
          :num-ticks="4"
        />
        <VisCrosshair color="var(--ui-neutral)" :template="tooltipTemplate" />
        <VisTooltip />
      </VisXYContainer>
    </div>
  </div>
</template>
