<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRange,
  AdminDashboardRecentCall,
  AdminDashboardTrendPoint
} from '~~/shared/types/admin-dashboard'
import { ADMIN_APIS_PATH } from '~/constants/admin-sections/apis'
import { ADMIN_LOGS_PATH } from '~/constants/admin-sections/logs'
import { ADMIN_USERS_PATH } from '~/constants/admin-sections/users'
import { formatDateTime } from '~/utils/datetime'
import { httpStatusColor, type HttpStatusColor } from '~/utils/http-status'

useHead({ title: '管理中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

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

const { data, status, refresh } = useLazyFetch<AdminDashboardData>('/api/admin/dashboard', {
  query: computed(() => ({ days: selectedRange.value })),
  default: createEmptyDashboardData
})
const dashboard = computed(() => data.value || createEmptyDashboardData())
const overview = computed(() => dashboard.value.overview)
const trend = computed(() => dashboard.value.trend)
const distribution = computed(() => dashboard.value.distribution)
const recentCalls = computed(() => dashboard.value.recentCalls)
const generatedAt = computed(() => formatDateTime(dashboard.value.generatedAt))
const callsTrendValues = computed(() => getCallsTrendValues(trend.value))
const successRateTrendValues = computed(() => getSuccessRateTrendValues(trend.value))

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
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Hero / 运营总览 -->
        <div class="overview-hero relative overflow-hidden rounded-2xl border border-default p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-5 relative z-10">
            <div class="lg:col-span-3 space-y-5">
              <div class="space-y-3">
                <UBadge
                  color="neutral"
                  variant="solid"
                  size="sm"
                  class="bg-elevated/80 text-default backdrop-blur"
                >
                  管理中心
                </UBadge>
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
              <div class="rounded-xl bg-elevated/85 border border-default backdrop-blur-sm p-4 space-y-4 shadow-sm">
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

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UCard :ui="{ body: 'space-y-3' }">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">注册用户</span>
                <UIcon
                  name="i-mdi-account-group-outline"
                  class="size-4 text-primary"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ formatNumber(overview.userCount) }}
                <span class="text-xs font-normal text-muted ml-1">人</span>
              </div>
            </UCard>

            <UCard :ui="{ body: 'space-y-3' }">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">启用 API</span>
                <UIcon
                  name="i-mdi-api"
                  class="size-4 text-info"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ formatNumber(overview.enabledApiCount) }}
                <span class="text-xs font-normal text-muted ml-1">个</span>
              </div>
              <p class="text-xs text-muted">
                共 {{ formatNumber(overview.totalApiCount) }} 个接口
              </p>
            </UCard>

            <UCard :ui="{ body: 'space-y-3' }">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">总调用</span>
                <UIcon
                  name="i-mdi-chart-line"
                  class="size-4 text-warning"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ formatNumber(overview.totalCalls) }}
                <span class="text-xs font-normal text-muted ml-1">次</span>
              </div>
              <DashboardSparkline
                :values="callsTrendValues"
                color="var(--ui-warning)"
              />
            </UCard>

            <UCard
              :ui="{ body: 'space-y-3' }"
              class="ring-1 ring-primary/10"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">成功率</span>
                <UIcon
                  name="i-mdi-shield-check-outline"
                  class="size-4 text-success"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ formatRate(overview.successRate) }}
              </div>
              <DashboardSparkline
                :values="successRateTrendValues"
                color="var(--ui-success)"
              />
            </UCard>
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
              :loading="status === 'pending'"
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
              :loading="status === 'pending'"
            />
          </UCard>
        </div>

        <UCard :ui="{ body: 'p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  最新 API 请求
                </h3>
                <p class="mt-1 text-sm text-muted">
                  最近 10 条调用记录
                </p>
              </div>
              <UButton
                :to="ADMIN_LOGS_PATH"
                variant="link"
                size="sm"
                trailing-icon="i-mdi-arrow-right"
              >
                查看完整日志
              </UButton>
            </div>
          </template>

          <DashboardDataTable
            :data="recentCalls"
            :columns="recentColumns"
            :loading="status === 'pending' && recentCalls.length === 0"
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
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.overview-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 14%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-warning) 12%, transparent) 0%, transparent 60%),
    radial-gradient(140% 100% at 100% 100%, color-mix(in oklab, var(--ui-success) 10%, transparent) 0%, transparent 60%),
    var(--ui-bg);
}
</style>
