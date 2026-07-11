<script setup lang="ts">
import { usePublicStatsDashboard } from '~/composables/stats/use-public-stats-dashboard'

useHead({ title: '数据统计' })
useSeoMeta({
  description: '公开 API 调用统计：累计调用次数、成功率、近 7 日趋势及调用排行。',
  ogTitle: '调用统计',
  ogDescription: '公开 API 调用统计：累计调用次数、成功率、近 7 日趋势及调用排行。'
})

definePageMeta({ layout: false })

const {
  error,
  formatCompact,
  formatCount,
  formatRate,
  generatedAtLabel,
  hasData,
  isInitialLoading,
  isPending,
  overview,
  overviewCards,
  reloadStats,
  rankingLast30d,
  topApi,
  trend7d,
  trendFailureCalls,
  trendSuccessCalls,
  trendTotalCalls
} = usePublicStatsDashboard()
</script>

<template>
  <UPage class="mx-auto max-w-275 px-5 pt-5 pb-6 sm:pt-6">
    <section class="stats-hero">
      <div
        class="stats-hero__pattern"
        aria-hidden="true"
      />

      <div class="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div class="stats-hero__layout">
          <div class="stats-hero__copy">
            <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
              公共调用统计
            </h1>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
              实时聚合公开 API 的调用规模、请求质量和热门接口，方便快速判断服务活跃度与稳定性。
            </p>
            <div
              v-if="generatedAtLabel"
              class="stats-hero__meta"
            >
              <span class="inline-flex items-center gap-1.5">
                <UIcon
                  name="i-mdi-clock-outline"
                  class="size-3.5"
                />
                <span class="font-mono text-default/85">{{ generatedAtLabel }}</span>
              </span>
            </div>
          </div>

          <div class="stats-hero__aside">
            <div class="stats-hero__actions">
              <UButton
                icon="i-mdi-refresh"
                variant="ghost"
                color="neutral"
                size="sm"
                class="stats-hero__nav-item"
                :loading="isPending"
                @click="reloadStats"
              >
                刷新
              </UButton>
              <UButton
                icon="i-mdi-home-outline"
                variant="ghost"
                color="neutral"
                size="sm"
                to="/"
                class="stats-hero__nav-item"
              >
                返回首页
              </UButton>
            </div>

            <div class="stats-hero__stats grid grid-cols-3 gap-2.5 sm:gap-3">
              <template v-if="isInitialLoading">
                <CommonHeroStatCard
                  v-for="n in 3"
                  :key="n"
                  loading
                />
              </template>

              <template v-else>
                <CommonHeroStatCard
                  icon="i-mdi-counter"
                  icon-tone="primary"
                  :value-title="overview ? formatCount(overview.totalCalls) : undefined"
                >
                  <template #value>
                    {{ overview ? formatCompact(overview.totalCalls) : '--' }}
                  </template>
                  累计调用
                </CommonHeroStatCard>

                <CommonHeroStatCard
                  icon="i-mdi-check-decagram-outline"
                  icon-tone="success"
                >
                  <template #value>
                    {{ overview ? formatRate(overview.successRate) : '--' }}
                  </template>
                  请求成功率
                </CommonHeroStatCard>

                <CommonHeroStatCard
                  icon="i-mdi-trophy-outline"
                  icon-tone="info"
                  :value-title="topApi?.name"
                  :label-title="topApi?.name"
                >
                  <template #value>
                    {{ topApi ? formatCompact(topApi.totalCalls) : '--' }}
                  </template>
                  {{ topApi?.name || '近 30 日热门接口' }}
                </CommonHeroStatCard>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <UPageBody class="mt-4 pb-0">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-mdi-alert-circle-outline"
        title="统计加载失败"
        description="请稍后重试，或检查网络连接。"
        class="mb-4"
        :actions="[{ label: '重试', color: 'neutral', variant: 'outline', icon: 'i-mdi-refresh', onClick: reloadStats }]"
      />

      <div
        v-if="isInitialLoading"
        class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <USkeleton
          v-for="n in 8"
          :key="n"
          class="h-34 w-full rounded-lg"
        />
      </div>

      <template v-else-if="hasData">
        <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetricCard
            v-for="item in overviewCards"
            :key="item.key"
            :label="item.label"
            :value="item.value"
            :icon="item.icon"
            :tone="item.tone"
            :style="{ '--dashboard-metric-accent': item.accent }"
          />
        </div>

        <div class="space-y-4">
          <UCard
            variant="subtle"
            class="stats-panel"
            :ui="{ body: 'p-4 sm:p-5' }"
          >
            <template #header>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-base font-semibold text-highlighted">
                    近 7 日趋势
                  </h2>
                  <p class="mt-0.5 text-sm text-muted">
                    按天聚合成功与失败调用次数
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    variant="soft"
                    color="success"
                    icon="i-mdi-check-circle-outline"
                    class="rounded-md"
                  >
                    {{ formatCompact(trendSuccessCalls) }}
                  </UBadge>
                  <UBadge
                    variant="soft"
                    color="error"
                    icon="i-mdi-close-circle-outline"
                    class="rounded-md"
                  >
                    {{ formatCompact(trendFailureCalls) }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="mb-4 grid gap-3 sm:grid-cols-3">
              <div class="stats-mini-metric">
                <span>7 日总调用</span>
                <strong>{{ formatCount(trendTotalCalls) }}</strong>
              </div>
              <div class="stats-mini-metric">
                <span>成功调用</span>
                <strong>{{ formatCount(trendSuccessCalls) }}</strong>
              </div>
              <div class="stats-mini-metric">
                <span>失败调用</span>
                <strong>{{ formatCount(trendFailureCalls) }}</strong>
              </div>
            </div>

            <ClientOnly>
              <Suspense>
                <LazyStatsTrendChart :trend="trend7d" />
                <template #fallback>
                  <div class="h-[320px] w-full rounded-lg bg-elevated/50" />
                </template>
              </Suspense>
              <template #fallback>
                <div class="h-[320px] w-full rounded-lg bg-elevated/50" />
              </template>
            </ClientOnly>
          </UCard>

          <UCard
            variant="subtle"
            class="stats-panel"
            :ui="{ body: 'p-4 sm:p-5' }"
          >
            <template #header>
              <div>
                <h2 class="text-base font-semibold text-highlighted">
                  近 30 日调用排行
                </h2>
                <p class="mt-0.5 text-sm text-muted">
                  Top {{ rankingLast30d.length || 10 }} 高频调用接口及成功率
                </p>
              </div>
            </template>

            <DashboardCallRanking :ranking="rankingLast30d" />
          </UCard>
        </div>
      </template>
    </UPageBody>

    <CommonAppFooter />
  </UPage>
</template>

<style scoped>
.stats-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 92%, var(--ui-primary) 8%) 0%,
      var(--ui-bg-elevated) 46%,
      color-mix(in srgb, var(--ui-bg) 86%, var(--ui-info) 14%) 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  isolation: isolate;
}

.dark .stats-hero {
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 90%, var(--ui-primary) 10%) 0%,
      var(--ui-bg-elevated) 48%,
      color-mix(in srgb, var(--ui-bg) 84%, var(--ui-info) 10%) 100%);
}

.stats-hero__pattern {
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

.stats-hero__layout {
  display: grid;
  grid-template-areas:
    "copy"
    "aside";
  gap: 16px;
}

.stats-hero__copy {
  grid-area: copy;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.stats-hero__meta {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.stats-hero__aside {
  grid-area: aside;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-hero__actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 58%, transparent);
  backdrop-filter: blur(8px);
}

.stats-hero__stats {
  min-width: 0;
}

.stats-hero__stats :deep(.hero-stat-card) {
  padding: 10px 10px 11px;
}

.stats-hero__stats :deep(.hero-stat-card__icon) {
  width: 24px;
  height: 24px;
  margin-bottom: 3px;
}

.stats-hero__stats :deep(.hero-stat-card__value) {
  font-size: 20px;
}

.stats-hero__nav-item {
  color: var(--ui-text-muted);
}

.stats-panel {
  overflow: hidden;
}

.stats-mini-metric {
  border: 1px solid color-mix(in srgb, var(--ui-border) 78%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 56%, transparent);
  padding: 10px 12px;
}

.stats-mini-metric span {
  display: block;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.stats-mini-metric strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

@media (min-width: 1024px) {
  .stats-hero__layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    grid-template-areas: "copy aside";
    gap: 36px;
    align-items: stretch;
  }

  .stats-hero__actions {
    justify-content: flex-end;
    align-self: flex-end;
  }

  .stats-hero__meta {
    margin-top: auto;
    padding-top: 24px;
  }
}

@media (max-width: 640px) {
  .stats-hero__actions {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
