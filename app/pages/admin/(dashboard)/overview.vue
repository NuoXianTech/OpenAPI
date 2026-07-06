<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRange,
  AdminDashboardRecentCall,
  AdminDashboardTrendPoint
} from '~~/shared/types/admin-dashboard'
import { ADMIN_APIS_PATH, ADMIN_LOGS_PATH, ADMIN_USERS_PATH } from '~/constants/dashboard-sections'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { httpStatusColor, type HttpStatusColor } from '~/utils/http-status'

useHead({ title: '管理中心' })

const { user } = useAuth()
const selectedRange = ref<AdminDashboardRange>(7)
const rangeOptions: Array<{ label: string, value: AdminDashboardRange }> = [
  { label: '近 7 天', value: 7 },
  { label: '近 14 天', value: 14 },
  { label: '近 30 天', value: 30 }
]
const recentColumns: TableColumn<AdminDashboardRecentCall>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'method', header: '方法' },
  { accessorKey: 'apiName', header: 'API' },
  { accessorKey: 'statusCode', header: '状态' },
  { accessorKey: 'latencyMs', header: '耗时' }
]

function createEmptyDashboardData(): AdminDashboardData {
  return {
    overview: {
      userCount: 0,
      enabledApiCount: 0,
      totalApiCount: 0,
      totalCalls: 0,
      successCalls: 0,
      failureCalls: 0,
      successRate: 0,
      todayCalls: 0,
      yesterdayCalls: 0,
      todayChangeRate: 0
    },
    trend: [],
    distribution: [],
    recentCalls: [],
    generatedAt: new Date(0).toISOString()
  }
}

const { data, loading, refresh } = usePrivateResource<AdminDashboardData>({
  path: '/api/admin/dashboard',
  query: computed(() => ({ days: selectedRange.value })),
  defaultData: createEmptyDashboardData
})
const overview = computed(() => data.value.overview)
const trend = computed(() => data.value.trend)
const distribution = computed(() => data.value.distribution)
const recentCalls = computed(() => data.value.recentCalls)
const generatedAt = computed(() => formatDateTime(data.value.generatedAt))
const callsTrendValues = computed(() => getCallsTrendValues(trend.value))
const successRateTrendValues = computed(() => getSuccessRateTrendValues(trend.value))

watch(selectedRange, () => { void refresh() })

interface OverviewMetricCard {
  key: string
  label: string
  value: string
  unit?: string
  meta?: string
  icon: string
  tone: 'neutral' | 'info' | 'warning' | 'success'
  sparklineValues?: number[]
  sparklineColor?: string
}

const overviewMetricCards = computed<OverviewMetricCard[]>(function getOverviewMetricCards() {
  return [
    {
      key: 'users',
      label: '注册用户',
      value: formatNumber(overview.value.userCount),
      unit: '人',
      meta: '当前平台注册账号总量',
      icon: 'i-mdi-account-group-outline',
      tone: 'neutral'
    },
    {
      key: 'apis',
      label: '启用 API',
      value: formatNumber(overview.value.enabledApiCount),
      unit: '个',
      meta: `共 ${formatNumber(overview.value.totalApiCount)} 个接口`,
      icon: 'i-mdi-api',
      tone: 'info'
    },
    {
      key: 'calls',
      label: '总调用',
      value: formatNumber(overview.value.totalCalls),
      unit: '次',
      icon: 'i-mdi-chart-line',
      tone: 'warning',
      sparklineValues: callsTrendValues.value,
      sparklineColor: 'var(--ui-warning)'
    },
    {
      key: 'success-rate',
      label: '成功率',
      value: formatRate(overview.value.successRate),
      icon: 'i-mdi-shield-check-outline',
      tone: 'success',
      sparklineValues: successRateTrendValues.value,
      sparklineColor: 'var(--ui-success)'
    }
  ]
})

function getCallsTrendValues(trendItems: AdminDashboardTrendPoint[]): number[] {
  return trendItems.map(point => point.totalCalls)
}

function getSuccessRateTrendValues(trendItems: AdminDashboardTrendPoint[]): number[] {
  return trendItems.map(point => (point.totalCalls > 0 ? (point.successCalls / point.totalCalls) * 100 : 0))
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`
}

function recentStatusColor(row: AdminDashboardRecentCall): HttpStatusColor {
  if (!row.isCounted) return 'neutral'
  if (row.errorCode) return 'error'
  return httpStatusColor(row.statusCode)
}
</script>

<template>
  <UDashboardPanel id="admin-home">
    <template #header>
      <UDashboardNavbar
        title="概览"
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
        <!-- Hero / 运营总览 -->
        <div class="overview-hero dashboard-hero-surface dashboard-hero-surface-mixed relative overflow-hidden rounded-lg border border-default p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-5 relative z-10">
            <div class="lg:col-span-3 space-y-5">
              <div class="space-y-3">
                <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-highlighted">
                  平台运营总览
                </h2>
                <p class="text-sm sm:text-base text-toned max-w-xl">
                  你好<span v-if="user?.username">，{{ user.username }}</span>。在这里管理用户、API 与系统配置，实时监控调用量与服务健康状态。
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  :to="ADMIN_USERS_PATH"
                  color="neutral"
                  size="md"
                  icon="i-mdi-account-group-outline"
                >
                  用户管理
                </UButton>
                <UButton
                  :to="ADMIN_APIS_PATH"
                  color="neutral"
                  variant="outline"
                  size="md"
                  icon="i-mdi-api"
                >
                  接口管理
                </UButton>
              </div>
            </div>

            <div class="lg:col-span-2 min-w-0">
              <div class="rounded-lg border border-default bg-elevated p-4 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-mdi-pulse"
                      class="size-4 text-muted"
                    />
                    <span class="text-sm font-medium">今日快照</span>
                  </div>
                  <span class="text-[11px] text-muted tabular-nums">{{ generatedAt }}</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <div class="text-xs text-muted">
                      今日调用
                    </div>
                    <div class="text-xl font-semibold tabular-nums">
                      {{ formatNumber(overview.todayCalls) }}
                    </div>
                  </div>
                  <div class="space-y-1">
                    <div class="text-xs text-muted">
                      成功率
                    </div>
                    <div class="text-xl font-semibold tabular-nums">
                      {{ formatRate(overview.successRate) }}
                    </div>
                  </div>
                </div>

                <div class="border-t border-default pt-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted">较昨日</span>
                    <span
                      :class="overview.todayChangeRate >= 0 ? 'text-success' : 'text-error'"
                      class="inline-flex items-center gap-1 font-medium"
                    >
                      <UIcon
                        :name="overview.todayChangeRate >= 0 ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
                        class="size-3.5"
                      />
                      {{ overview.todayChangeRate >= 0 ? '+' : '' }}{{ overview.todayChangeRate.toFixed(1) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 平台概览 -->
        <section class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">
                平台概览
              </h3>
              <p class="text-sm text-muted">
                用户、接口与调用总览
              </p>
            </div>
            <UButton
              :to="ADMIN_LOGS_PATH"
              size="xs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-mdi-chevron-right"
            >
              查看调用日志
            </UButton>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardMetricCard
              v-for="card in overviewMetricCards"
              :key="card.key"
              :label="card.label"
              :value="card.value"
              :unit="card.unit"
              :meta="card.meta"
              :icon="card.icon"
              :tone="card.tone"
              :sparkline-values="card.sparklineValues"
              :sparkline-color="card.sparklineColor"
            />
          </div>
        </section>

        <div class="grid gap-4 xl:grid-cols-5">
          <UCard class="xl:col-span-3">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-highlighted">
                    API 调用趋势
                  </h3>
                  <p class="mt-1 text-sm text-muted">
                    按天聚合总调用、成功与失败次数
                  </p>
                </div>
                <USelect
                  v-model="selectedRange"
                  :items="rangeOptions"
                  value-key="value"
                  size="sm"
                  class="w-32"
                />
              </div>
            </template>

            <AdminDashboardTrend
              :trend="trend"
              :loading="loading"
            />
          </UCard>

          <UCard class="xl:col-span-2">
            <template #header>
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  API 使用分布
                </h3>
                <p class="mt-1 text-sm text-muted">
                  Top 6 高频调用接口
                </p>
              </div>
            </template>

            <AdminDashboardDistribution
              :distribution="distribution"
              :loading="loading"
            />
          </UCard>
        </div>

        <DashboardTableCard
          title="最新 API 请求"
          icon="i-mdi-history"
          :total="recentCalls.length"
        >
          <template #actions>
            <UButton
              :to="ADMIN_LOGS_PATH"
              variant="link"
              size="sm"
              trailing-icon="i-mdi-arrow-right"
            >
              查看完整日志
            </UButton>
          </template>

          <DashboardDataTable
            :data="recentCalls"
            :columns="recentColumns"
            :loading="loading && recentCalls.length === 0"
            empty-title="暂无请求日志"
            empty-icon="i-mdi-history"
          >
            <template #createdAt-cell="{ row }">
              <span class="whitespace-nowrap text-xs tabular-nums text-muted">
                {{ formatDateTime(row.original.createdAt) }}
              </span>
            </template>
            <template #method-cell="{ row }">
              <UBadge
                :color="httpMethodColor(row.original.method)"
                variant="subtle"
                size="sm"
                class="font-mono"
              >
                {{ row.original.method }}
              </UBadge>
            </template>
            <template #apiName-cell="{ row }">
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">
                  {{ row.original.apiName }}
                </div>
                <div class="truncate text-xs font-mono text-muted">
                  {{ row.original.apiPath }}
                </div>
              </div>
            </template>
            <template #statusCode-cell="{ row }">
              <UBadge
                :color="recentStatusColor(row.original)"
                variant="subtle"
                size="sm"
              >
                {{ row.original.statusCode }}
              </UBadge>
            </template>
            <template #latencyMs-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums text-xs">{{ row.original.latencyMs }} ms</span>
            </template>
          </DashboardDataTable>
        </DashboardTableCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
