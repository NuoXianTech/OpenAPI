<script setup lang="ts">
const metricToneClasses = {
  primary: 'dashboard-metric-card-primary',
  neutral: 'dashboard-metric-card-neutral',
  info: 'dashboard-metric-card-info',
  warning: 'dashboard-metric-card-warning',
  success: 'dashboard-metric-card-success',
  error: 'dashboard-metric-card-error'
} as const

interface DashboardMetricCardProps {
  label: string
  value: string
  icon: string
  unit?: string
  meta?: string
  tone?: keyof typeof metricToneClasses
  compact?: boolean
  sparklineValues?: number[]
  sparklineColor?: string
}

interface SparklinePathState {
  linePath: string
  areaPath: string
  allZero: boolean
}

const props = withDefaults(defineProps<DashboardMetricCardProps>(), {
  tone: 'neutral',
  unit: undefined,
  meta: undefined,
  compact: false,
  sparklineValues: undefined,
  sparklineColor: undefined
})

const slots = useSlots()
const hasFooter = computed(() => Boolean(
  slots.footer
  || props.meta
  || (props.sparklineValues?.length && props.sparklineColor)
))
const bodyClass = computed(() => [
  'relative z-10 flex flex-col',
  props.compact ? 'gap-3 p-3 sm:p-4' : 'gap-4 p-4 sm:p-5',
  hasFooter.value ? props.compact ? 'min-h-28' : 'min-h-32' : undefined
])
const footerClass = computed(() => props.compact ? 'mt-auto min-h-6' : 'mt-auto min-h-8')
const valueClass = computed(() => props.compact
  ? 'dashboard-metric-card-value text-xl font-semibold tabular-nums text-highlighted'
  : 'dashboard-metric-card-value text-2xl font-semibold tabular-nums text-highlighted')
const iconClass = computed(() => props.compact
  ? 'dashboard-metric-card-icon flex size-8 shrink-0 items-center justify-center rounded-md'
  : 'dashboard-metric-card-icon flex size-9 shrink-0 items-center justify-center rounded-md')
const sparklineHeight = computed(() => props.compact ? 36 : SPARKLINE_HEIGHT)

const SPARKLINE_VIEW_W = 200
const SPARKLINE_VIEW_H = 60
const SPARKLINE_PAD = 4
const SPARKLINE_HEIGHT = 48

function buildSparklinePath(values: number[]): SparklinePathState {
  const vals = values.length ? values : [0, 0]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const usableW = SPARKLINE_VIEW_W - SPARKLINE_PAD * 2
  const usableH = SPARKLINE_VIEW_H - SPARKLINE_PAD * 2
  const step = vals.length > 1 ? usableW / (vals.length - 1) : 0

  const points = vals.map((value, index) => {
    const x = SPARKLINE_PAD + step * index
    const y = SPARKLINE_PAD + (1 - (value - min) / range) * usableH
    return { x, y }
  })

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
  const lastX = points[points.length - 1]?.x ?? SPARKLINE_PAD
  const firstX = points[0]?.x ?? SPARKLINE_PAD
  const areaPath = `${linePath} L${lastX.toFixed(2)},${SPARKLINE_VIEW_H - SPARKLINE_PAD} L${firstX.toFixed(2)},${SPARKLINE_VIEW_H - SPARKLINE_PAD} Z`

  return { linePath, areaPath, allZero: max === min && max === 0 }
}

const sparkline = computed(() => buildSparklinePath(props.sparklineValues ?? []))
</script>

<template>
  <UCard
    variant="outline"
    class="dashboard-metric-card"
    :class="metricToneClasses[props.tone]"
    :ui="{ body: bodyClass }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <p class="truncate text-xs font-medium text-muted">
          {{ label }}
        </p>
        <div class="flex items-baseline gap-1.5">
          <span :class="valueClass">
            {{ value }}
          </span>
          <span
            v-if="unit"
            class="text-xs font-medium text-muted"
          >
            {{ unit }}
          </span>
        </div>
      </div>

      <div :class="iconClass">
        <UIcon
          :name="icon"
          class="size-4.5"
        />
      </div>
    </div>

    <div
      v-if="hasFooter"
      :class="footerClass"
    >
      <slot name="footer">
        <svg
          v-if="sparklineValues && sparklineColor"
          :viewBox="`0 0 ${SPARKLINE_VIEW_W} ${SPARKLINE_VIEW_H}`"
          preserveAspectRatio="none"
          :style="{ height: `${sparklineHeight}px`, width: '100%' }"
          class="block overflow-visible"
          aria-hidden="true"
        >
          <line
            v-if="sparkline.allZero"
            :x1="SPARKLINE_PAD"
            :x2="SPARKLINE_VIEW_W - SPARKLINE_PAD"
            :y1="SPARKLINE_VIEW_H / 2"
            :y2="SPARKLINE_VIEW_H / 2"
            :stroke="sparklineColor"
            stroke-width="1.5"
            stroke-dasharray="3 4"
            opacity="0.5"
            vector-effect="non-scaling-stroke"
          />
          <template v-else>
            <path
              :d="sparkline.areaPath"
              :fill="sparklineColor"
              opacity="0.12"
            />
            <path
              :d="sparkline.linePath"
              fill="none"
              :stroke="sparklineColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </template>
        </svg>
        <p
          v-else-if="meta"
          class="dashboard-metric-card-meta truncate text-xs text-muted"
        >
          {{ meta }}
        </p>
      </slot>
    </div>
  </UCard>
</template>

<style scoped>
.dashboard-metric-card {
  --dashboard-metric-accent: var(--ui-primary);
  border-color: var(--dashboard-border);
  box-shadow: inset 0 2px 0 color-mix(in oklab, var(--dashboard-metric-accent) 72%, transparent);
}

.dashboard-metric-card-neutral {
  --dashboard-metric-accent: var(--ui-primary);
}

.dashboard-metric-card-primary {
  --dashboard-metric-accent: var(--ui-primary);
}

.dashboard-metric-card-info {
  --dashboard-metric-accent: var(--ui-info);
}

.dashboard-metric-card-warning {
  --dashboard-metric-accent: var(--ui-warning);
}

.dashboard-metric-card-success {
  --dashboard-metric-accent: var(--ui-success);
}

.dashboard-metric-card-error {
  --dashboard-metric-accent: var(--ui-error);
}

.dashboard-metric-card-icon {
  color: var(--dashboard-metric-accent);
  border: 1px solid color-mix(in oklab, var(--dashboard-metric-accent) 18%, var(--ui-border));
  background: color-mix(in oklab, var(--dashboard-metric-accent) 7%, var(--ui-bg-elevated));
}

.dashboard-metric-card-value {
  letter-spacing: 0;
}

.dashboard-metric-card-meta {
  line-height: 1.5;
}
</style>
