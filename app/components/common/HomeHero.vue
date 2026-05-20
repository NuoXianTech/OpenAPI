<script lang="ts" setup>
interface Props {
  startTime?: string
  siteName?: string
  siteDescription?: string
  totalCount?: number
  normalCount?: number
  categoryCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  startTime: '2026-02-02 00:00:00',
  siteName: 'OpenAPI',
  siteDescription: '免费为用户提供网络数据接口调用的服务平台',
  totalCount: 0,
  normalCount: 0,
  categoryCount: 0
})

const startTimestamp = computed(() => {
  const ts = new Date(props.startTime).getTime()
  return Number.isNaN(ts) ? Date.now() : ts
})

const padZero = (n: number) => String(n).padStart(2, '0')
const formatNowTime = (date = new Date()) =>
  `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`

const formatUpTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60))
  const days = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const parts: string[] = []
  if (years > 0) parts.push(`${years}年`)
  if (days > 0 || years > 0) parts.push(`${days}天`)
  if (hours > 0 || days > 0 || years > 0) parts.push(`${hours}时`)
  if (minutes > 0 || hours > 0 || days > 0 || years > 0) parts.push(`${minutes}分`)
  return parts.join(' ') || '0分'
}

const nowTime = ref(formatNowTime())
const upTime = ref(formatUpTime(Date.now() - startTimestamp.value))
let timer: number | undefined

const updateTimes = () => {
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

const healthRatio = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.round((props.normalCount / props.totalCount) * 100)
})
</script>

<template>
  <section class="home-hero">
    <div
      class="home-hero__pattern"
      aria-hidden="true"
    />
    <div
      class="home-hero__glow"
      aria-hidden="true"
    />

    <div class="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-10 lg:p-9">
      <div class="flex flex-col">
        <UBadge
          color="neutral"
          variant="outline"
          size="sm"
          class="mb-3 w-fit gap-1 rounded-full px-2.5 py-1 text-[11px] tracking-[0.18em] uppercase"
        >
          <UIcon
            name="i-lucide-sparkles"
            class="size-3.5"
          />
          Free · Open · Stable
        </UBadge>

        <h1 class="m-0 text-[28px] leading-tight font-semibold tracking-tight text-default sm:text-[34px]">
          {{ siteName }}
          <span class="home-hero__title-mark" />
        </h1>
        <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
          {{ siteDescription }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted">
          <span class="inline-flex items-center gap-1.5">
            <span class="hero-pulse-dot" />
            服务在线
          </span>
          <USeparator
            orientation="vertical"
            class="h-3"
          />
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-lucide-clock"
              class="size-3.5"
            />
            <span class="font-mono tracking-tight text-default/85">{{ nowTime }}</span>
          </span>
          <USeparator
            orientation="vertical"
            class="hidden h-3 sm:inline-flex"
          />
          <span class="hidden items-center gap-1.5 sm:inline-flex">
            <UIcon
              name="i-lucide-server"
              class="size-3.5"
            />
            <span class="font-mono tracking-tight text-default/85">{{ upTime }}</span>
          </span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="hero-stat">
          <div class="hero-stat__icon">
            <UIcon
              name="i-lucide-layers"
              class="size-4"
            />
          </div>
          <div class="hero-stat__value">
            {{ totalCount }}
          </div>
          <div class="hero-stat__label">
            接口总数
          </div>
        </div>

        <div class="hero-stat hero-stat--accent">
          <div class="hero-stat__icon">
            <UIcon
              name="i-lucide-activity"
              class="size-4"
            />
          </div>
          <div class="hero-stat__value">
            {{ healthRatio }}<span class="text-base text-muted">%</span>
          </div>
          <div class="hero-stat__label">
            可用率
          </div>
        </div>

        <div class="hero-stat">
          <div class="hero-stat__icon">
            <UIcon
              name="i-lucide-shapes"
              class="size-4"
            />
          </div>
          <div class="hero-stat__value">
            {{ categoryCount }}
          </div>
          <div class="hero-stat__label">
            分类数
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
