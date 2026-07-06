<script setup lang="ts">
import { ADMIN_OVERVIEW_PATH, USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'

interface HomeHeroDashboardMeta {
  path: string
  label: string
  icon: string
}

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

// 实时时钟依赖"当前时刻"：SSR 渲染时刻与客户端 hydrate 时刻必然不同（秒级字段几乎必错），
// 初始留空让两端首帧一致以避免 hydration mismatch；真实值由下方 onMounted 的 updateTimes() 填充并每秒刷新。
const nowTime = ref('')
const upTime = ref('')
const startTimestamp = computed(() => parseStartTimestamp(props.startTime))
const compactCallCount = computed(() => formatCompactCallCount(props.callCount))
const dashboardMeta = computed(() => getDashboardMeta(user.value?.kind))
const dashboardPath = computed(() => dashboardMeta.value.path)
const dashboardLabel = computed(() => dashboardMeta.value.label)
const dashboardIcon = computed(() => dashboardMeta.value.icon)
let timer: number | undefined

function padZero(value: number): string {
  return String(value).padStart(2, '0')
}

function formatNowTime(date = new Date()): string {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`
}

function formatUpTime(ms: number): string {
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

  return parts.join('') || '0分'
}

function parseStartTimestamp(startTime: string | undefined): number {
  const timestamp = new Date(startTime || '').getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

function formatCompactCallCount(callCount = 0): string {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(callCount)
}

function getDashboardMeta(userKind: string | null | undefined): HomeHeroDashboardMeta {
  if (userKind === 'admin') {
    return {
      path: ADMIN_OVERVIEW_PATH,
      label: '管理后台',
      icon: 'i-mdi-shield-crown-outline'
    }
  }

  return {
    path: USER_OVERVIEW_PATH,
    label: '用户后台',
    icon: 'i-mdi-view-dashboard-outline'
  }
}

function updateTimes(date = new Date()): void {
  nowTime.value = formatNowTime(date)
  upTime.value = formatUpTime(date.getTime() - startTimestamp.value)
}

onMounted(() => {
  updateTimes()
  timer = window.setInterval(() => updateTimes(), 1000)
})

onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
})

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

    <div class="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div class="hero-layout">
        <div class="hero-copy">
          <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
            {{ siteName }}
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            {{ siteDescription }}
          </p>

          <div class="hero-meta flex flex-wrap items-center gap-2.5 text-xs text-muted">
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

        <div class="hero-aside">
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
                    :icon="dashboardIcon"
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

          <div class="hero-stats grid grid-cols-3 gap-2.5 sm:gap-3">
            <CommonHeroStatCard
              icon="i-mdi-layers-outline"
              icon-tone="info"
            >
              <template #value>
                {{ totalCount }}
              </template>
              接口总数
            </CommonHeroStatCard>

            <CommonHeroStatCard
              icon="i-mdi-check-circle-outline"
              icon-tone="success"
            >
              <template #value>
                {{ normalCount }}
              </template>
              可用接口
            </CommonHeroStatCard>

            <CommonHeroStatCard
              icon="i-mdi-counter"
              icon-tone="primary"
              :value-title="callCount.toLocaleString('zh-CN')"
            >
              <template #value>
                {{ compactCallCount }}
              </template>
              调用次数
            </CommonHeroStatCard>
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

.hero-layout {
  display: grid;
  grid-template-areas:
    "copy"
    "aside";
  gap: 16px;
}

.hero-copy {
  grid-area: copy;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.hero-meta {
  margin-top: 20px;
}

.hero-aside {
  grid-area: aside;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.hero-stats {
  min-width: 0;
}

.hero-stats :deep(.hero-stat-card) {
  padding: 10px 10px 11px;
}

.hero-stats :deep(.hero-stat-card__icon) {
  width: 24px;
  height: 24px;
  margin-bottom: 3px;
}

.hero-stats :deep(.hero-stat-card__value) {
  font-size: 20px;
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

@media (min-width: 1024px) {
  .hero-layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    grid-template-areas: "copy aside";
    gap: 36px;
    align-items: stretch;
  }

  .hero-actions {
    justify-content: flex-end;
  }

  .hero-meta {
    margin-top: auto;
    padding-top: 24px;
  }
}

@media (max-width: 640px) {
  .hero-actions {
    width: 100%;
  }

  .hero-auth {
    padding-left: 0;
    border-left: 0;
  }
}
</style>
