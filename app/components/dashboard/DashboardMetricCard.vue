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
  sparklineValues?: number[]
  sparklineColor?: string
}

const props = withDefaults(defineProps<DashboardMetricCardProps>(), {
  tone: 'neutral',
  unit: undefined,
  meta: undefined,
  sparklineValues: undefined,
  sparklineColor: undefined
})
</script>

<template>
  <UCard
    variant="outline"
    class="dashboard-metric-card"
    :class="metricToneClasses[props.tone]"
    :ui="{ body: 'relative z-10 flex min-h-32 flex-col gap-4 p-4 sm:p-5' }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <p class="truncate text-xs font-medium text-muted">
          {{ label }}
        </p>
        <div class="flex items-baseline gap-1.5">
          <span class="dashboard-metric-card-value text-2xl font-semibold tabular-nums text-highlighted">
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

      <div class="dashboard-metric-card-icon flex size-9 shrink-0 items-center justify-center rounded-lg">
        <UIcon
          :name="icon"
          class="size-4.5"
        />
      </div>
    </div>

    <div class="mt-auto min-h-8">
      <slot name="footer">
        <DashboardSparkline
          v-if="sparklineValues && sparklineColor"
          :values="sparklineValues"
          :color="sparklineColor"
        />
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
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
}

.dashboard-metric-card-value {
  letter-spacing: 0;
}

.dashboard-metric-card-meta {
  line-height: 1.5;
}
</style>
