<script setup lang="ts">
interface Props {
  values: number[]
  color?: string
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: 'var(--ui-primary)',
  height: 48
})

const VIEW_W = 200
const VIEW_H = 60
const PAD = 4

const normalized = computed(() => {
  const vals = props.values.length ? props.values : [0, 0]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const usableW = VIEW_W - PAD * 2
  const usableH = VIEW_H - PAD * 2
  const step = vals.length > 1 ? usableW / (vals.length - 1) : 0

  const points = vals.map((v, i) => {
    const x = PAD + step * i
    const y = PAD + (1 - (v - min) / range) * usableH
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const lastX = points[points.length - 1]?.x ?? PAD
  const firstX = points[0]?.x ?? PAD
  const areaPath = `${linePath} L${lastX.toFixed(2)},${VIEW_H - PAD} L${firstX.toFixed(2)},${VIEW_H - PAD} Z`

  return { linePath, areaPath, allZero: max === min && max === 0 }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    preserveAspectRatio="none"
    :style="{ height: `${height}px`, width: '100%' }"
    class="block overflow-visible"
    aria-hidden="true"
  >
    <line
      v-if="normalized.allZero"
      :x1="PAD"
      :x2="VIEW_W - PAD"
      :y1="VIEW_H / 2"
      :y2="VIEW_H / 2"
      :stroke="color"
      stroke-width="1.5"
      stroke-dasharray="3 4"
      opacity="0.5"
      vector-effect="non-scaling-stroke"
    />
    <template v-else>
      <path
        :d="normalized.areaPath"
        :fill="color"
        opacity="0.12"
      />
      <path
        :d="normalized.linePath"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </template>
  </svg>
</template>
