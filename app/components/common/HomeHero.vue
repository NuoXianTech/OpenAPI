<script lang="ts" setup>
import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'
import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

interface Props {
  startTime?: string
  siteName?: string
  siteDescription?: string
  totalCount?: number
  normalCount?: number
  callCount?: number
  apiListLoading?: boolean
  apiListError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  startTime: '2026-02-02 00:00:00',
  siteName: 'OpenAPI',
  siteDescription: '免费为用户提供网络数据接口调用的服务平台',
  totalCount: 0,
  normalCount: 0,
  callCount: 0,
  apiListLoading: false,
  apiListError: false
})

const { user, logout } = useAuth()

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

// 实时时钟依赖"当前时刻"：SSR 渲染时刻与客户端 hydrate 时刻必然不同（秒级字段几乎必错），
// 初始留空让两端首帧一致以避免 hydration mismatch；真实值由下方 onMounted 的 updateTimes() 填充并每秒刷新。
const nowTime = ref('')
const upTime = ref('')
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

type ListStatusTone = 'info' | 'error' | 'neutral' | 'success'

const listStatus = computed<{ label: string, tone: ListStatusTone, title: string }>(() => {
  if (props.apiListLoading) {
    return {
      label: '加载中',
      tone: 'info',
      title: '依据：首页公开接口列表和分类接口正在加载'
    }
  }
  if (props.apiListError) {
    return {
      label: '加载失败',
      tone: 'error',
      title: '依据：首页公开接口列表或分类接口请求失败'
    }
  }
  if (props.totalCount <= 0) {
    return {
      label: '暂无接口',
      tone: 'neutral',
      title: '依据：首页公开接口列表请求成功，但当前没有接口'
    }
  }
  return {
    label: '接口正常',
    tone: 'success',
    title: '依据：首页公开接口列表和分类接口请求成功'
  }
})

const compactCallCount = computed(() => new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(props.callCount))

const dashboardPath = computed(() => user.value?.kind === 'admin' ? ADMIN_OVERVIEW_PATH : USER_OVERVIEW_PATH)
const dashboardLabel = computed(() => user.value?.kind === 'admin' ? '管理后台' : '用户后台')

async function handleLogout() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <section class="home-hero">
    <div
      class="home-hero__pattern"
      aria-hidden="true"
    />

    <div class="relative p-5 sm:p-7 lg:p-8">
      <div class="hero-topbar">
        <UBadge
          color="neutral"
          variant="outline"
          size="sm"
          class="hidden w-fit gap-1 rounded-md px-2.5 py-1 text-[11px] sm:inline-flex"
        >
          <UIcon
            name="i-mdi-creation-outline"
            class="size-3.5"
          />
          Free · Open · Stable
        </UBadge>

        <div class="hero-actions">
          <div
            class="hero-nav"
            aria-label="公开导航"
          >
            <UButton
              to="/stats"
              icon="i-mdi-chart-bar"
              color="neutral"
              variant="ghost"
              size="sm"
              class="hero-nav__item"
            >
              调用统计
            </UButton>
            <UButton
              to="/friend-links"
              icon="i-mdi-link-variant"
              color="neutral"
              variant="ghost"
              size="sm"
              class="hero-nav__item"
            >
              友情链接
            </UButton>
          </div>

          <ClientOnly>
            <template v-if="user">
              <div class="hero-auth">
                <UButton
                  :to="dashboardPath"
                  :icon="user.kind === 'admin' ? 'i-mdi-shield-crown-outline' : 'i-mdi-view-dashboard-outline'"
                  size="sm"
                >
                  {{ dashboardLabel }}
                </UButton>
                <UButton
                  icon="i-mdi-logout"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="handleLogout"
                >
                  退出登录
                </UButton>
              </div>
            </template>
            <template v-else>
              <div class="hero-auth">
                <UButton
                  to="/login"
                  icon="i-mdi-login"
                  size="sm"
                >
                  登录
                </UButton>
                <UButton
                  to="/register"
                  icon="i-mdi-account-plus-outline"
                  color="neutral"
                  variant="outline"
                  size="sm"
                >
                  注册
                </UButton>
                <UTooltip text="管理入口">
                  <UButton
                    to="/admin/login"
                    icon="i-mdi-shield-key-outline"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    aria-label="管理入口"
                  />
                </UTooltip>
              </div>
            </template>
            <template #fallback>
              <div class="hero-auth">
                <USkeleton class="h-8 w-16 rounded-md" />
                <USkeleton class="h-8 w-16 rounded-md" />
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <div class="mt-6 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10">
        <div class="flex flex-col">
          <div class="mb-3">
            <UBadge
              color="neutral"
              variant="outline"
              size="sm"
              class="w-fit gap-1 rounded-md px-2.5 py-1 text-[11px] sm:hidden"
            >
              <UIcon
                name="i-mdi-creation-outline"
                class="size-3.5"
              />
              Free · Open · Stable
            </UBadge>
          </div>

          <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
            {{ siteName }}
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            {{ siteDescription }}
          </p>

          <div class="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted">
            <span
              class="inline-flex items-center gap-1.5"
              :title="listStatus.title"
            >
              <span
                class="hero-status-dot"
                :class="`is-${listStatus.tone}`"
              />
              {{ listStatus.label }}
            </span>
            <USeparator
              orientation="vertical"
              class="h-3"
            />
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-mdi-clock-outline"
                class="size-3.5"
              />
              <span class="font-mono text-default/85">{{ nowTime }}</span>
            </span>
            <USeparator
              orientation="vertical"
              class="hidden h-3 sm:inline-flex"
            />
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-server"
                class="size-3.5"
              />
              <span class="font-mono text-default/85">{{ upTime }}</span>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-layers-outline"
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

          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-check-circle-outline"
                class="size-4"
              />
            </div>
            <div class="hero-stat__value">
              {{ normalCount }}
            </div>
            <div class="hero-stat__label">
              可用接口 · {{ healthRatio }}%
            </div>
          </div>

          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-counter"
                class="size-4"
              />
            </div>
            <div
              class="hero-stat__value"
              :title="callCount.toLocaleString('zh-CN')"
            >
              {{ compactCallCount }}
            </div>
            <div class="hero-stat__label">
              累计调用
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 90%, var(--ui-primary) 10%) 0%,
      var(--ui-bg-elevated) 42%,
      color-mix(in srgb, var(--ui-bg) 84%, var(--ui-info) 16%) 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  isolation: isolate;
}

.dark .home-hero {
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 88%, var(--ui-primary) 12%) 0%,
      var(--ui-bg-elevated) 46%,
      color-mix(in srgb, var(--ui-bg) 82%, var(--ui-success) 10%) 100%);
}

.home-hero__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
  background-size: 18px 18px;
  color: var(--ui-text);
  opacity: 0.045;
  mask-image: radial-gradient(ellipse at top right, black 10%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at top right, black 10%, transparent 70%);
  pointer-events: none;
}

.hero-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.hero-nav,
.hero-auth {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.hero-nav {
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 58%, transparent);
  backdrop-filter: blur(8px);
}

.hero-auth {
  padding-left: 8px;
  border-left: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
}

.hero-nav__item {
  color: var(--ui-text-muted);
}

.hero-status-dot {
  --hero-status-color: var(--ui-success);

  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hero-status-color);
  position: relative;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero-status-color) 18%, transparent);
  flex: 0 0 auto;
}

.hero-status-dot::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--hero-status-color) 55%, transparent);
  animation: heroPulse 2s ease-out infinite;
}

.hero-status-dot.is-info {
  --hero-status-color: var(--ui-info);
}

.hero-status-dot.is-error {
  --hero-status-color: var(--ui-error);
}

.hero-status-dot.is-neutral {
  --hero-status-color: var(--ui-text-muted);
}

.hero-status-dot.is-error::after,
.hero-status-dot.is-neutral::after {
  display: none;
}

.hero-stat {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 8%) 0%,
      color-mix(in srgb, var(--ui-bg) 82%, transparent) 100%);
  border-radius: 8px;
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 40%, transparent);
  transition: transform 220ms ease, border-color 220ms ease, background-color 220ms ease;
  backdrop-filter: blur(8px);
}

.hero-stat:hover {
  transform: translateY(-2px);
  border-color: var(--ui-border-accented);
}

.dark .hero-stat {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 5%) 0%,
      color-mix(in srgb, var(--ui-bg) 86%, transparent) 100%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
}

.hero-stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ui-text) 7%, transparent);
  color: var(--ui-text-muted);
  margin-bottom: 4px;
}

.hero-stat:nth-child(1) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-info) 13%, transparent);
  color: var(--ui-info);
}

.hero-stat:nth-child(2) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-success) 13%, transparent);
  color: var(--ui-success);
}

.hero-stat:nth-child(3) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-primary) 10%, transparent);
  color: var(--ui-text);
}

.hero-stat__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hero-stat__label {
  font-size: 11px;
  color: var(--ui-text-muted);
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .hero-topbar {
    align-items: flex-start;
  }

  .hero-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .hero-auth {
    padding-left: 0;
    border-left: 0;
  }

  .hero-stat__value {
    font-size: 18px;
  }
  .hero-stat__icon {
    width: 22px;
    height: 22px;
  }
}

@keyframes heroPulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
</style>
