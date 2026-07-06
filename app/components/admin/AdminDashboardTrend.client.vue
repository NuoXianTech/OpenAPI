<script setup lang="ts">
import { VisXYContainer, VisArea, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { AdminDashboardTrendPoint } from '#shared/types/admin'

// 本组件是 .client.vue（@unovis 的 d3+DOM 不进 admin 首屏 entry）。
// unovis 原语必须静态导入、同步可用——各自 defineAsyncComponent 会让 VisXYContainer 在
// VisAxis 注册前就首绘，导致坐标轴首帧画不出来（须点刷新才补画）。

interface Props {
  trend: AdminDashboardTrendPoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

// 宽度响应式喂给容器：unovis 首挂载测得 0 时不绘轴，宽度由 0→真实值的变更驱动重绘出刻度
const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

interface TrendRow {
  label: string
  fullLabel: string
  total: number
  success: number
  failure: number
}

const rows = computed<TrendRow[]>(() => props.trend.map(item => ({
  label: formatTrendShortDate(item.date),
  fullLabel: formatTrendFullDate(item.date),
  total: item.totalCalls,
  success: item.successCalls,
  failure: item.failureCalls
})))

const formatCount = (value: number) => value.toLocaleString()

const x = (_row: TrendRow, index: number) => index
const totalAccessor = (row: TrendRow) => row.total
const successAccessor = (row: TrendRow) => row.success
const failureAccessor = (row: TrendRow) => row.failure

// 准星圆点配色，按 y 访问器顺序对应总调用 / 成功 / 失败
const crosshairColors = ['var(--ui-primary)', 'var(--ui-success)', 'var(--ui-error)'] as const

// 把任意刻度（可能为小数）映射回最近的数据索引取其 MM-DD 标签，配合 num-ticks 控制密度，
// 兼容 7 / 14 / 30 天不同跨度（取代旧逻辑里强行置空首尾刻度导致几乎不显示日期的问题）。
const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick === 'string') return tick
  if (typeof tick !== 'number') return ''
  const maxIndex = Math.max(rows.value.length - 1, 0)
  const index = Math.min(maxIndex, Math.max(0, Math.round(tick)))
  return rows.value[index]?.label || ''
}

const yTickFormat = (tick: number | Date) => (typeof tick === 'number' ? `${Math.round(tick)}` : '')

// 走全站统一的卡片式 tooltip 渲染器（utils/chart-tooltip.ts），标题含「周X」与 stats 同款
const tooltipTemplate = (d: TrendRow | undefined) => {
  if (!d) return ''
  const rate = d.total > 0 ? `${((d.success / d.total) * 100).toFixed(1)}%` : '--'
  return renderChartTooltip({
    title: d.fullLabel,
    rows: [
      { color: 'var(--ui-primary)', label: '总调用', value: formatCount(d.total) },
      { color: 'var(--ui-success)', label: '成功', value: formatCount(d.success) },
      { color: 'var(--ui-error)', label: '失败', value: formatCount(d.failure) }
    ],
    footer: [
      { label: '成功率', value: rate }
    ]
  })
}
</script>

<template>
  <div
    ref="cardRef"
    class="relative"
  >
    <div
      v-if="rows.length === 0 && !loading"
      class="flex h-72 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
    >
      暂无调用数据
    </div>

    <template v-else>
      <VisXYContainer
        :data="rows"
        :padding="{ top: 20, right: 16, bottom: 28, left: 8 }"
        :width="width"
        class="h-72"
      >
        <VisArea
          :x="x"
          :y="totalAccessor"
          color="var(--ui-primary)"
          :opacity="0.08"
        />
        <VisLine
          :x="x"
          :y="totalAccessor"
          color="var(--ui-primary)"
          :line-width="2.5"
        />
        <VisLine
          :x="x"
          :y="successAccessor"
          color="var(--ui-success)"
          :line-width="2"
        />
        <VisLine
          :x="x"
          :y="failureAccessor"
          color="var(--ui-error)"
          :line-width="2"
        />
        <VisAxis
          type="y"
          :tick-line="false"
          :domain-line="false"
          :grid-line="true"
          :tick-format="yTickFormat"
          :num-ticks="4"
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
          :y="[totalAccessor, successAccessor, failureAccessor]"
          :color="crosshairColors"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>

      <div class="mt-4 flex flex-wrap gap-2">
        <UBadge
          variant="soft"
          color="primary"
          icon="i-lucide-circle"
          class="rounded-md"
        >
          总调用
        </UBadge>
        <UBadge
          variant="soft"
          color="success"
          icon="i-lucide-circle"
          class="rounded-md"
        >
          成功
        </UBadge>
        <UBadge
          variant="soft"
          color="error"
          icon="i-lucide-circle"
          class="rounded-md"
        >
          失败
        </UBadge>
      </div>
    </template>
  </div>
</template>
