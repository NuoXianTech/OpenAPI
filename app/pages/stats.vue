<script setup lang="ts">
import { usePublicStatsDashboard } from '~/composables/stats/usePublicStatsDashboard'

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
  formatMethod,
  formatRate,
  generatedAtLabel,
  getRankPercent,
  hasData,
  isInitialLoading,
  isPending,
  overview,
  overviewCards,
  rankColumns,
  rankSuccessTone,
  reloadStats,
  successRateProgress,
  top10Last30d,
  topApi,
  trackedApiRatio,
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

      <div class="relative p-5 sm:p-7 lg:p-8">
        <div class="stats-hero__topbar">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <UBadge
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-mdi-chart-bar"
              class="rounded-md px-2.5 py-1 text-[11px]"
            >
              公开数据
            </UBadge>
            <UBadge
              v-if="generatedAtLabel"
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-mdi-clock-outline"
              class="rounded-md px-2.5 py-1 text-[11px]"
            >
              {{ generatedAtLabel }}
            </UBadge>
          </div>

          <div class="stats-hero__actions">
            <UButton
              icon="i-mdi-refresh"
              variant="outline"
              color="neutral"
              size="sm"
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
            >
              返回首页
            </UButton>
          </div>
        </div>

        <div class="mt-6 grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:gap-10">
          <div>
            <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
              公共调用统计
            </h1>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
              实时聚合公开 API 的调用规模、请求质量和热门接口，方便快速判断服务活跃度与稳定性。
            </p>

            <div class="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted">
              <span class="inline-flex items-center gap-1.5">
                <CommonStatusDot :tone="isPending ? 'info' : 'success'" />
                {{ isPending ? '同步中' : '统计已就绪' }}
              </span>
              <USeparator
                orientation="vertical"
                class="h-3"
              />
              <span class="inline-flex items-center gap-1.5">
                <UIcon
                  name="i-mdi-api"
                  class="size-3.5"
                />
                已启用 <span class="font-mono text-default/85">{{ overview ? formatCount(overview.enabledTrackedApiCount) : '--' }}</span> 个统计接口
              </span>
              <USeparator
                orientation="vertical"
                class="hidden h-3 sm:inline-flex"
              />
              <span class="hidden items-center gap-1.5 sm:inline-flex">
                <UIcon
                  name="i-mdi-account-group-outline"
                  class="size-3.5"
                />
                用户 <span class="font-mono text-default/85">{{ overview ? formatCount(overview.userCount) : '--' }}</span>
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
    </section>

    <UPageBody class="mt-4">
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
        <UPageGrid class="mb-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard
            v-for="item in overviewCards"
            :key="item.key"
            variant="subtle"
            class="stats-card"
            :style="{ '--stat-accent': item.accent }"
            :ui="{ body: 'p-4 sm:p-5' }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-xs font-medium text-muted">
                  {{ item.label }}
                </div>
                <div
                  class="mt-2 truncate text-2xl font-semibold leading-none text-highlighted tabular-nums"
                  :title="item.value"
                >
                  {{ item.value }}
                </div>
              </div>
              <div
                class="stats-card__icon"
                :class="`is-${item.tone}`"
              >
                <UIcon
                  :name="item.icon"
                  class="size-4"
                />
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              <span class="min-w-0 truncate">{{ item.helper }}</span>
              <UBadge
                :color="item.tone"
                variant="soft"
                size="sm"
                class="shrink-0 rounded-md"
              >
                {{ item.key === 'successRate' ? formatRate(successRateProgress) : item.key === 'enabledStatsApis' ? formatRate(trackedApiRatio) : '实时' }}
              </UBadge>
            </div>

            <UProgress
              v-if="item.key === 'successRate' || item.key === 'enabledStatsApis'"
              :model-value="item.key === 'successRate' ? successRateProgress : trackedApiRatio"
              :color="item.tone"
              size="xs"
              class="mt-3"
            />
          </UCard>
        </UPageGrid>

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
              <StatsTrendChart :trend="trend7d" />
              <template #fallback>
                <div class="h-[320px] w-full rounded-lg bg-elevated/50" />
              </template>
            </ClientOnly>
          </UCard>

          <UCard
            variant="subtle"
            class="stats-panel"
            :ui="{ body: 'p-3 sm:p-4' }"
          >
            <template #header>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-base font-semibold text-highlighted">
                    近 30 日调用排行
                  </h2>
                  <p class="mt-0.5 text-sm text-muted">
                    按调用总次数排序的 TOP 10 接口
                  </p>
                </div>
                <UBadge
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="rounded-md"
                >
                  TOP 10
                </UBadge>
              </div>
            </template>

            <DashboardDataTable
              :data="top10Last30d"
              :columns="rankColumns"
              :fixed="false"
              empty-icon="i-mdi-chart-bar"
              empty-title="暂无调用数据"
              empty-description="近 30 天还没有任何接口调用记录。"
            >
              <template #rank-cell="{ row }">
                <UBadge
                  :color="row.original.rank <= 3 ? 'primary' : 'neutral'"
                  :variant="row.original.rank <= 3 ? 'solid' : 'soft'"
                  class="w-7 justify-center rounded-md tabular-nums"
                >
                  {{ row.original.rank }}
                </UBadge>
              </template>

              <template #name-cell="{ row }">
                <div class="min-w-0 max-w-[520px]">
                  <div
                    class="truncate text-sm font-medium text-default"
                    :title="row.original.name"
                  >
                    {{ row.original.name }}
                  </div>
                  <div class="mt-1 flex items-center gap-1.5">
                    <UBadge
                      color="neutral"
                      variant="subtle"
                      size="sm"
                      class="shrink-0 rounded font-mono"
                    >
                      {{ formatMethod(row.original.httpMethod) }}
                    </UBadge>
                    <span
                      class="truncate font-mono text-xs text-muted"
                      :title="row.original.apiPath"
                    >
                      {{ row.original.apiPath }}
                    </span>
                  </div>
                </div>
              </template>

              <template #totalCalls-cell="{ row }">
                <div class="min-w-[140px]">
                  <div class="text-sm font-semibold tabular-nums text-highlighted">
                    {{ formatCount(row.original.totalCalls) }}
                  </div>
                  <div class="mt-1.5 flex items-center gap-2">
                    <div class="stats-table-bar">
                      <span :style="{ width: `${getRankPercent(row.original.totalCalls)}%` }" />
                    </div>
                    <span class="shrink-0 text-xs text-muted tabular-nums">
                      {{ Math.round(getRankPercent(row.original.totalCalls)) }}%
                    </span>
                  </div>
                </div>
              </template>

              <template #successRate-cell="{ row }">
                <UBadge
                  :color="rankSuccessTone(row.original.successRate)"
                  variant="soft"
                  size="sm"
                  class="rounded-md tabular-nums"
                >
                  {{ formatRate(row.original.successRate) }}
                </UBadge>
              </template>
            </DashboardDataTable>
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
      color-mix(in srgb, var(--ui-bg-elevated) 90%, var(--ui-primary) 10%) 0%,
      var(--ui-bg-elevated) 42%,
      color-mix(in srgb, var(--ui-bg) 84%, var(--ui-info) 16%) 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  isolation: isolate;
}

.dark .stats-hero {
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 88%, var(--ui-primary) 12%) 0%,
      var(--ui-bg-elevated) 46%,
      color-mix(in srgb, var(--ui-bg) 82%, var(--ui-success) 10%) 100%);
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

.stats-hero__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-hero__actions {
  margin-left: auto;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.stats-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex: 0 0 auto;
}

.stats-card__icon.is-primary {
  background: color-mix(in srgb, var(--ui-primary) 10%, transparent);
  color: var(--ui-text);
}

.stats-card__icon.is-success {
  background: color-mix(in srgb, var(--ui-success) 13%, transparent);
  color: var(--ui-success);
}

.stats-card__icon.is-info {
  background: color-mix(in srgb, var(--ui-info) 13%, transparent);
  color: var(--ui-info);
}

.stats-card__icon.is-warning {
  background: color-mix(in srgb, var(--ui-warning) 15%, transparent);
  color: var(--ui-warning);
}

.stats-card__icon.is-error {
  background: color-mix(in srgb, var(--ui-error) 13%, transparent);
  color: var(--ui-error);
}

.stats-card__icon.is-neutral {
  background: color-mix(in srgb, var(--ui-text) 7%, transparent);
  color: var(--ui-text-muted);
}

.stats-card {
  position: relative;
  overflow: hidden;
}

.stats-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: color-mix(in srgb, var(--stat-accent, var(--ui-primary)) 72%, transparent);
  opacity: 0.7;
}

.stats-card__icon {
  width: 32px;
  height: 32px;
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

/* 表格内的相对调用量迷你进度条：宽度 = 占榜首比例，单色不喧宾夺主 */
.stats-table-bar {
  position: relative;
  flex: 1 1 auto;
  min-width: 48px;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-border) 72%, transparent);
}

.stats-table-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--ui-primary);
}

@media (max-width: 640px) {
  .stats-hero__topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-hero__actions {
    justify-content: flex-start;
    margin-left: 0;
    width: 100%;
  }
}
</style>
