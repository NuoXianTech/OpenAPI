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

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function parseTrendDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toShortDate(value: string) {
  const date = parseTrendDate(value)
  if (!date) {
    return value
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

function toFullDate(value: string) {
  const date = parseTrendDate(value)
  if (!date) {
    return value
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day} ${WEEKDAY_LABELS[date.getDay()]}`
}

interface TrendRow {
  label: string
  fullLabel: string
  success: number
  failure: number
}

const rows = computed<TrendRow[]>(() => props.trend.map(item => ({
  label: toShortDate(item.date),
  fullLabel: toFullDate(item.date),
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Crosshair 模板渲染成游离于组件作用域外的 HTML，故走内联样式（与 admin 图表同款），
// 不依赖全局 class，组件自包含。
function tooltipTemplate(datum: TrendRow | undefined) {
  if (!datum) {
    return ''
  }
  const total = datum.success + datum.failure
  const rate = total > 0 ? `${((datum.success / total) * 100).toFixed(1)}%` : '--'
  return `
    <div style="min-width:168px;padding:10px 12px;font-variant-numeric:tabular-nums">
      <div style="font-size:12px;font-weight:600;color:var(--ui-text-highlighted)">${escapeHtml(datum.fullLabel)}</div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:1">
          <span style="width:8px;height:8px;border-radius:999px;flex:0 0 auto;background:var(--ui-success)"></span>
          <span style="color:var(--ui-text-muted)">成功</span>
          <span style="margin-left:auto;font-weight:600;color:var(--ui-text-highlighted)">${formatCount(datum.success)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:1">
          <span style="width:8px;height:8px;border-radius:999px;flex:0 0 auto;background:var(--ui-error)"></span>
          <span style="color:var(--ui-text-muted)">失败</span>
          <span style="margin-left:auto;font-weight:600;color:var(--ui-text-highlighted)">${formatCount(datum.failure)}</span>
        </div>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--ui-border);display:flex;justify-content:space-between;gap:12px;font-size:11px;color:var(--ui-text-muted)">
        <span>合计 <strong style="color:var(--ui-text-highlighted);font-weight:600">${formatCount(total)}</strong></span>
        <span>成功率 <strong style="color:var(--ui-text-highlighted);font-weight:600">${rate}</strong></span>
      </div>
    </div>`
}
</script>

<template>
  <div
    ref="rootRef"
    class="stats-chart relative"
  >
    <UEmpty
      v-if="!hasData"
      icon="i-mdi-chart-line"
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
          icon="i-mdi-circle"
          class="rounded-md"
        >
          成功次数
        </UBadge>
        <UBadge
          variant="soft"
          color="error"
          icon="i-mdi-circle"
          class="rounded-md"
        >
          失败次数
        </UBadge>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-chart {
  /* 让 unovis 的坐标轴 / 网格 / 准星沿用主题语义色，自动适配暗色 */
  --vis-font-family: inherit;
  --vis-axis-grid-color: color-mix(in srgb, var(--ui-border) 70%, transparent);
  --vis-axis-grid-line-width: 1;
  --vis-axis-tick-label-color: var(--ui-text-muted);
  --vis-axis-tick-label-font-size: 12px;
  --vis-crosshair-line-stroke-color: color-mix(in srgb, var(--ui-text) 28%, transparent);
  --vis-crosshair-line-stroke-width: 1;
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-crosshair-circle-stroke-width: 2;
  /* tooltip 外层容器作为卡片本体 */
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text);
  --vis-tooltip-border-radius: 10px;
  --vis-tooltip-padding: 0;
  --vis-tooltip-box-shadow: 0 8px 24px -6px color-mix(in srgb, var(--ui-text) 22%, transparent);
}
</style>
