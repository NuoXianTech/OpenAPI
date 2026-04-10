<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const nowTime = ref('')
const upTime = ref('')

interface Props {
  startTime?: string
}

const props = withDefaults(defineProps<Props>(), {
  startTime: '2026-02-02 00:00:00', // 未定义时默认的起始时间
})

const startTimestamp = computed(() => {
  const timestamp = new Date(props.startTime).getTime()
  if (isNaN(timestamp)) {
    console.warn('Invalid startTime prop, using current time as fallback')
    return Date.now()
  }
  return timestamp
})

const padZero = (n: number): string => String(n).padStart(2, '0')

const formatNowTime = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())} ${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`
}

// 格式化运行时间（支持年、天、时、分、秒）
const formatUpTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)

  const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60))
  const days = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const _seconds = totalSeconds % 60

  const parts: string[] = []

  if (years > 0) parts.push(`${years} 年`)
  if (days > 0 || years > 0) parts.push(`${days} 天`)
  if (hours > 0 || days > 0 || years > 0) parts.push(`${hours} 小时`)
  if (minutes > 0 || hours > 0 || days > 0 || years > 0) parts.push(`${minutes} 分`)
  // parts.push(`${seconds} 秒`);

  return parts.join(' ')
}

let timer: number | undefined

const updateTimes = (): void => {
  nowTime.value = formatNowTime()
  upTime.value = formatUpTime(Date.now() - startTimestamp.value)
}

onMounted(() => {
  updateTimes()
  timer = window.setInterval(updateTimes, 1000)
})

onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
})
</script>

<template>
  <Card class="mb-3 max-w-275 border-border py-3 shadow-sm">
    <CardContent class="space-y-2 px-4 text-[13px]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-muted-foreground">
          <Icon
            name="mdi:clock-outline"
            size="14"
            :ssr="true"
          />
          当前时间：
        </span>
        <Badge
          variant="secondary"
          class="font-mono"
        >
          {{ nowTime }}
        </Badge>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-muted-foreground">
          <Icon
            name="mdi:server-outline"
            size="14"
            :ssr="true"
          />
          稳定运行：
        </span>
        <Badge
          variant="outline"
          class="font-mono"
        >
          {{ upTime }}
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
