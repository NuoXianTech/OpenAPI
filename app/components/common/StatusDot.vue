<script setup lang="ts">
type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'neutral'

const { tone = 'success', pulse } = defineProps<{
  tone?: StatusTone
  pulse?: boolean
}>()

// tone 映射到语义色变量（neutral 退化到文字弱化色）。这些变量本身内置 light/dark 切换。
const TONE_COLORS: Record<StatusTone, string> = {
  success: 'var(--ui-success)',
  info: 'var(--ui-info)',
  warning: 'var(--ui-warning)',
  error: 'var(--ui-error)',
  neutral: 'var(--ui-text-muted)'
}

// 默认：success / info / warning 常驻脉冲表示“活跃”，error / neutral 静止；pulse 可显式覆盖
const showPulse = computed(() => pulse ?? (tone !== 'error' && tone !== 'neutral'))
const dotColor = computed(() => TONE_COLORS[tone])
</script>

<template>
  <span
    class="status-dot"
    :class="{ 'has-pulse': showPulse }"
    :style="{ '--status-dot-color': dotColor }"
  />
</template>

<style scoped>
.status-dot {
  position: relative;
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--status-dot-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-dot-color) 18%, transparent);
}

.status-dot.has-pulse::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--status-dot-color) 55%, transparent);
  animation: statusDotPulse 2s ease-out infinite;
}

@keyframes statusDotPulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
</style>
