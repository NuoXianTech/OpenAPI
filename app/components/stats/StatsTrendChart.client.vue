<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { PublicCallStatsTrendPoint } from '~~/shared/types/public-stats'

// 本组件是 .client.vue（仅客户端打包，@unovis 的 d3+DOM 不进首屏 entry）。
// 注意：unovis 原语必须静态导入、同步可用——若各自用 defineAsyncComponent 异步加载，
// VisXYContainer 可能在 VisAxis 解析注册前就完成首次绘制，导致坐标轴首帧画不出来，
// 只有后续一次数据 update 才补画（即「点刷新才出现坐标轴」的根因）。

interface Props {
  trend: PublicCallStatsTrendPoint[]
}

const props = defineProps<Props>()

// 把容器宽度响应式地喂给 VisXYContainer（官方仪表盘模板同款）：
// unovis 首次挂载时内部测得的宽度可能为 0、不绘制坐标轴，必须等一次尺寸变化才补画。
// useElementSize 在元素测量后由 0 更新为真实宽度，这次变更即驱动 unovis 重绘画出刻度。
const rootRef = useTemplateRef<HTMLElement | null>('rootRef')
const { width } = useElementSize(rootRef)

interface TrendRow {
  label: string
  fullLabel: string
  success: number
  failure: number
}

const rows = computed<TrendRow[]>(() => props.trend.map(item => ({
  label: formatTrendShortDate(item.date),
  fullLabel: formatTrendFullDate(item.date),
  success: item.successCalls,
  failure: item.failureCalls
})))

const hasData = computed(() => rows.value.some(row => row.success + row.failure > 0))

const formatCount = (value: number) => value.toLocaleString()

const x = (_row: TrendRow, index: number) => index
const successAccessor = (row: TrendRow) => row.success
const failureAccessor = (row: TrendRow) => row.failure

// 准星圆点配色，按 y 访问器顺序对应成功 / 失败
const crosshairColors = ['var(--ui-success)', 'var(--ui-error)'] as const

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick === 'string') {
    return tick
  }
  if (typeof tick !== 'number') {
    return ''
  }
  const maxIndex = Math.max(rows.value.length - 1, 0)
  const index = Math.min(maxIndex, Math.max(0, Math.round(tick)))
  return rows.value[index]?.label || ''
}

const yTickFormat = (tick: number | Date) => (typeof tick === 'number' ? `${Math.round(tick)}` : '')

// 走全站统一的卡片式 tooltip 渲染器（utils/chart-tooltip.ts），与 admin 数据看板同款
function tooltipTemplate(datum: TrendRow | undefined) {
  if (!datum) {
    return ''
  }
  const total = datum.success + datum.failure
  const rate = total > 0 ? `${((datum.success / total) * 100).toFixed(1)}%` : '--'
  return renderChartTooltip({
    title: datum.fullLabel,
    rows: [
      { color: 'var(--ui-success)', label: '成功', value: formatCount(datum.success) },
      { color: 'var(--ui-error)', label: '失败', value: formatCount(datum.failure) }
    ],
    footer: [
      { label: '合计', value: formatCount(total) },
      { label: '成功率', value: rate }
    ]
  })
}
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
  >
    <UEmpty
      v-if="!hasData"
      icon="i-lucide-chart-line"
      title="暂无趋势数据"
      description="近 7 天还没有可展示的调用趋势。"
      class="h-[320px]"
    />

    <template v-else>
      <VisXYContainer
        :data="rows"
        :padding="{ left: 8, right: 16, top: 20, bottom: 28 }"
        :width="width"
        class="h-[320px] w-full"
      >
        <VisArea
          :x="x"
          :y="successAccessor"
          color="var(--ui-success)"
          :opacity="0.12"
        />
        <VisLine
          :x="x"
          :y="successAccessor"
          color="var(--ui-success)"
          :line-width="2.8"
        />
        <VisLine
          :x="x"
          :y="failureAccessor"
          color="var(--ui-error)"
          :line-width="2.4"
        />
        <VisAxis
          type="y"
          :tick-line="false"
          :domain-line="false"
          :grid-line="true"
          :tick-format="yTickFormat"
        />
        <VisAxis
          type="x"
          :tick-line="false"
          :domain-line="false"
          :grid-line="false"
          :tick-format="xTickFormat"
          :num-ticks="7"
        />
        <VisCrosshair
          :x="x"
          :y="[successAccessor, failureAccessor]"
          :color="crosshairColors"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>

      <div class="mt-4 flex flex-wrap gap-2">
        <UBadge
          variant="soft"
          color="success"
          icon="i-lucide-circle"
          class="rounded-md"
        >
          成功次数
        </UBadge>
        <UBadge
          variant="soft"
          color="error"
          icon="i-lucide-circle"
          class="rounded-md"
        >
          失败次数
        </UBadge>
      </div>
    </template>
  </div>
</template>
