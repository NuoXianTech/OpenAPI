<script setup lang="ts">
import type { AdminAnalyticsData } from '#shared/types/admin'
import {
  createEmptyAdminAnalyticsData,
  useAdminAnalyticsDisplayMeta
} from '~/composables/admin/use-admin-display-meta'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

useHead({ title: '数据看板' })
const { data } = usePrivateResource<AdminAnalyticsData>({
  path: '/api/admin/analytics',
  defaultData: createEmptyAdminAnalyticsData
})

const {
  distribution,
  hourlyTrend24h,
  callBuckets,
  ranking,
  distributionChart,
  distributionChartItems,
  generatedAtLabel,
  formatCompact,
  overviewCards
} = useAdminAnalyticsDisplayMeta({ analytics: data })

const analyticsMetricTones = {
  primary: 'neutral',
  warning: 'warning',
  info: 'info'
} as const
</script>

<template>
  <UDashboardPanel id="admin-analytics">
    <template #header>
      <UDashboardNavbar
        title="数据看板"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UPageHeader
          title="数据看板"
          :description="`公共接口分析 · 数据更新于 ${generatedAtLabel}`"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-chart-box-outline"
                class="size-6 text-primary"
              />
              <span>数据看板</span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
                class="ml-1"
              >
                公共接口
              </UBadge>
            </div>
          </template>
        </UPageHeader>

        <!-- 概览卡片 -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardMetricCard
            v-for="card in overviewCards"
            :key="card.key"
            :label="card.label"
            :value="card.value"
            :icon="card.icon"
            :meta="card.helper"
            :tone="analyticsMetricTones[card.accent]"
          />
        </div>

        <!-- 请求分布 -->
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  请求分布
                </h3>
                <p class="mt-1 text-sm text-muted">
                  各启用接口的请求情况（成功 / 失败叠加展示）
                </p>
              </div>
              <UTabs
                v-model="distributionChart"
                :items="distributionChartItems"
                size="sm"
                color="primary"
                variant="link"
                :ui="{ list: 'h-8' }"
              />
            </div>
          </template>

          <ClientOnly>
            <Suspense>
              <LazyAdminAnalyticsDistributionBar
                v-if="distributionChart === 'bar'"
                :distribution="distribution"
              />
              <LazyAdminAnalyticsDistributionArea
                v-else
                :distribution="distribution"
              />
              <template #fallback>
                <div class="h-72 w-full rounded-lg bg-elevated/50" />
              </template>
            </Suspense>
            <template #fallback>
              <div class="h-72 w-full rounded-lg bg-elevated/50" />
            </template>
          </ClientOnly>
        </UCard>

        <!-- 接口调用分析 -->
        <div class="grid gap-4 xl:grid-cols-2">
          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  调用趋势（近 24 小时）
                </h3>
                <p class="mt-1 text-sm text-muted">
                  按小时聚合的请求次数
                </p>
              </div>
            </template>
            <ClientOnly>
              <Suspense>
                <LazyAdminAnalyticsHourlyTrend :trend="hourlyTrend24h" />
                <template #fallback>
                  <div class="h-64 w-full rounded-lg bg-elevated/50" />
                </template>
              </Suspense>
              <template #fallback>
                <div class="h-64 w-full rounded-lg bg-elevated/50" />
              </template>
            </ClientOnly>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  调用次数分布
                </h3>
                <p class="mt-1 text-sm text-muted">
                  按调用量分桶统计的接口数量
                </p>
              </div>
            </template>
            <ClientOnly>
              <Suspense>
                <LazyAdminAnalyticsCallBuckets :buckets="callBuckets" />
                <template #fallback>
                  <div class="h-64 w-full rounded-lg bg-elevated/50" />
                </template>
              </Suspense>
              <template #fallback>
                <div class="h-64 w-full rounded-lg bg-elevated/50" />
              </template>
            </ClientOnly>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  调用次数排行
                </h3>
                <p class="mt-1 text-sm text-muted">
                  TOP {{ ranking.length }} 高频调用接口
                </p>
              </div>
              <UBadge
                color="primary"
                variant="soft"
                size="sm"
                icon="i-mdi-trophy-outline"
              >
                {{ formatCompact(ranking.reduce((sum, r) => sum + r.totalCalls, 0)) }}
              </UBadge>
            </div>
          </template>
          <AdminAnalyticsRanking :ranking="ranking" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
