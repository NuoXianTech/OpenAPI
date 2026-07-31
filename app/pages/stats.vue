<script setup lang="ts">
import { usePublicStatsDashboard } from '~/composables/stats/use-public-stats-dashboard'

const { t } = useI18n()
useHead(() => ({ title: t('public.stats.pageTitle') }))
useSeoMeta({
  description: () => t('public.stats.seoDescription'),
  ogTitle: () => t('public.stats.seoTitle'),
  ogDescription: () => t('public.stats.seoDescription')
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

const retryActions = computed(() => [{
  label: t('common.actions.retry'),
  color: 'neutral' as const,
  variant: 'outline' as const,
  icon: 'i-mdi-refresh',
  onClick: reloadStats
}])
</script>

<template>
  <div class="public-page">
    <CommonSiteHeader />
    <UPage class="mx-auto w-full max-w-295 flex-1 px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
      <section class="stats-hero">
        <div class="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div class="stats-hero__layout">
            <div class="stats-hero__copy">
              <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
                {{ $t('public.stats.heroTitle') }}
              </h1>
              <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
                {{ $t('public.stats.heroDescription') }}
              </p>
              <div class="stats-hero__meta">
                <span
                  v-if="generatedAtLabel"
                  class="inline-flex items-center gap-1.5"
                >
                  <UIcon
                    name="i-mdi-clock-outline"
                    class="size-3.5"
                  />
                  <span class="font-mono text-default/85">{{ generatedAtLabel }}</span>
                </span>
                <UButton
                  icon="i-mdi-refresh"
                  variant="subtle"
                  color="neutral"
                  size="sm"
                  :loading="isPending"
                  @click="reloadStats"
                >
                  {{ $t('public.stats.refresh') }}
                </UButton>
              </div>
            </div>

            <div class="stats-hero__aside">
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
                    icon-tone="ink"
                    :value-title="overview ? formatCount(overview.totalCalls) : undefined"
                  >
                    <template #value>
                      {{ overview ? formatCompact(overview.totalCalls) : '--' }}
                    </template>
                    {{ $t('public.stats.totalCalls') }}
                  </CommonHeroStatCard>

                  <CommonHeroStatCard
                    icon="i-mdi-check-decagram-outline"
                    icon-tone="blue"
                  >
                    <template #value>
                      {{ overview ? formatRate(overview.successRate) : '--' }}
                    </template>
                    {{ $t('public.stats.successRate') }}
                  </CommonHeroStatCard>

                  <CommonHeroStatCard
                    icon="i-mdi-trophy-outline"
                    icon-tone="violet"
                    :value-title="topApi?.name"
                    :label-title="topApi?.name"
                  >
                    <template #value>
                      {{ topApi ? formatCompact(topApi.totalCalls) : '--' }}
                    </template>
                    {{ topApi?.name || $t('public.stats.popularApi') }}
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
          :title="t('public.stats.loadFailed')"
          :description="t('public.stats.loadFailedDescription')"
          class="mb-4"
          :actions="retryActions"
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
              :meta="item.helper"
              compact
            />
          </div>

          <div class="space-y-4">
            <UCard
              variant="subtle"
              class="stats-panel"
              :ui="{ body: 'p-4 sm:p-5' }"
            >
              <template #header>
                <div>
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ $t('public.stats.trendTitle') }}
                  </h2>
                  <p class="mt-0.5 text-sm text-muted">
                    {{ $t('public.stats.trendDescription') }}
                  </p>
                </div>
              </template>

              <dl class="stats-summary-strip mb-4">
                <div>
                  <dt>{{ $t('public.stats.trendTotal') }}</dt>
                  <dd>{{ formatCount(trendTotalCalls) }}</dd>
                </div>
                <div>
                  <dt>{{ $t('public.stats.successCalls') }}</dt>
                  <dd>{{ formatCount(trendSuccessCalls) }}</dd>
                </div>
                <div>
                  <dt>{{ $t('public.stats.failureCalls') }}</dt>
                  <dd>{{ formatCount(trendFailureCalls) }}</dd>
                </div>
              </dl>

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
                    {{ $t('public.stats.rankingTitle') }}
                  </h2>
                  <p class="mt-0.5 text-sm text-muted">
                    {{ $t('public.stats.rankingDescription', { count: rankingLast30d.length || 10 }) }}
                  </p>
                </div>
              </template>

              <DashboardCallRanking :ranking="rankingLast30d" />
            </UCard>
          </div>
        </template>
      </UPageBody>
    </UPage>
    <CommonAppFooter />
  </div>
</template>

<style scoped>
.stats-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--ui-border);
  isolation: isolate;
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
  gap: 12px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.stats-hero__aside {
  grid-area: aside;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
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

.stats-panel {
  overflow: hidden;
}

.stats-summary-strip {
  display: grid;
  border-block: 1px solid var(--ui-border-muted);
}

.stats-summary-strip > div {
  min-width: 0;
  padding-block: 12px;
}

.stats-summary-strip > div + div {
  border-top: 1px solid var(--ui-border-muted);
}

.stats-summary-strip dt {
  display: block;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.stats-summary-strip dd {
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

@media (min-width: 640px) {
  .stats-summary-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stats-summary-strip > div {
    padding-inline: 16px;
  }

  .stats-summary-strip > div:first-child {
    padding-left: 0;
  }

  .stats-summary-strip > div:last-child {
    padding-right: 0;
  }

  .stats-summary-strip > div + div {
    border-top: 0;
    border-left: 1px solid var(--ui-border-muted);
  }
}

@media (min-width: 1024px) {
  .stats-hero__layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    grid-template-areas: "copy aside";
    gap: 36px;
    align-items: stretch;
  }

  .stats-hero__meta {
    margin-top: auto;
    padding-top: 24px;
  }
}
</style>
