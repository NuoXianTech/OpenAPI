<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRecentCall
} from '~~/shared/types/admin-dashboard'
import { ADMIN_APIS_PATH } from '~/constants/admin-sections/apis'
import { ADMIN_USERS_PATH } from '~/constants/admin-sections/users'

useHead({ title: '管理中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

function createEmptyData(): AdminDashboardData {
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

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 14 天', value: 14 },
  { label: '近 30 天', value: 30 }
]
const selectedRange = ref<number>(7)

const { data, status, refresh } = useLazyFetch<AdminDashboardData>('/api/admin/dashboard', {
  query: computed(() => ({ days: selectedRange.value })),
  default: () => createEmptyData()
})

const dashboard = computed(() => data.value || createEmptyData())
const overview = computed(() => dashboard.value.overview)
const trend = computed(() => dashboard.value.trend)
const distribution = computed(() => dashboard.value.distribution)
const recentCalls = computed(() => dashboard.value.recentCalls)
const generatedAt = computed(() => {
  const date = new Date(dashboard.value.generatedAt)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
})

const formatNumber = (val: number) => val.toLocaleString()
const formatRate = (val: number) => `${val.toFixed(2)}%`

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

function statusColor(code: number): 'success' | 'warning' | 'error' | 'neutral' {
  if (code >= 500) return 'error'
  if (code >= 400) return 'warning'
  if (code >= 200 && code < 400) return 'success'
  return 'neutral'
}

function recentStatusColor(row: AdminDashboardRecentCall): 'success' | 'warning' | 'error' | 'neutral' {
  if (!row.isCounted) return 'neutral'
  if (row.errorCode) return 'error'
  return statusColor(row.statusCode)
}

function methodColor(method: string): 'info' | 'success' | 'warning' | 'error' | 'neutral' {
  switch (method.toUpperCase()) {
    case 'GET': return 'info'
    case 'POST': return 'success'
    case 'PUT': return 'warning'
    case 'DELETE': return 'error'
    default: return 'neutral'
  }
}

const recentColumns: TableColumn<AdminDashboardRecentCall>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'method', header: '方法' },
  { accessorKey: 'apiName', header: 'API' },
  { accessorKey: 'statusCode', header: '状态' },
  { accessorKey: 'latencyMs', header: '耗时' }
]
</script>

<template>
  <UDashboardPanel id="admin-home">
    <template #header>
      <UDashboardNavbar title="仪表盘">
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
        <UPageHeader
          title="管理员仪表盘"
          :description="`数据更新于 ${generatedAt}`"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-shield-crown-outline"
                class="size-6 text-primary"
              />
              <span>管理员仪表盘</span>
            </div>
          </template>
        </UPageHeader>

        <UPageGrid class="sm:grid-cols-2 lg:grid-cols-4">
          <UPageCard
            icon="i-mdi-account-group-outline"
            :title="formatNumber(overview.userCount)"
            description="注册用户"
            :to="ADMIN_USERS_PATH"
            variant="subtle"
            class="[&_h3]:tabular-nums"
          />
          <UPageCard
            icon="i-mdi-api"
            :title="`${formatNumber(overview.enabledApiCount)} / ${formatNumber(overview.totalApiCount)}`"
            description="启用 API"
            :to="ADMIN_APIS_PATH"
            variant="subtle"
            class="[&_h3]:tabular-nums"
          />
          <UPageCard
            icon="i-mdi-chart-line"
            :title="formatNumber(overview.totalCalls)"
            description="总调用"
            :to="`${ADMIN_APIS_PATH}/calls`"
            variant="subtle"
            class="[&_h3]:tabular-nums"
          >
            <template #footer>
              <p class="text-xs text-muted">
                <span
                  v-if="overview.todayChangeRate !== null"
                  :class="overview.todayChangeRate >= 0 ? 'text-success' : 'text-error'"
                  class="mr-1 inline-flex items-center gap-0.5"
                >
                  <UIcon
                    :name="overview.todayChangeRate >= 0 ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
                    class="size-3.5"
                  />
                  {{ overview.todayChangeRate >= 0 ? '+' : '' }}{{ overview.todayChangeRate.toFixed(1) }}%
                </span>
                今日 {{ formatNumber(overview.todayCalls) }}
              </p>
            </template>
          </UPageCard>
          <UPageCard
            icon="i-mdi-shield-check-outline"
            :title="formatRate(overview.successRate)"
            description="成功率"
            :to="`${ADMIN_APIS_PATH}/calls`"
            variant="subtle"
            class="[&_h3]:tabular-nums"
          >
            <template #footer>
              <p class="text-xs text-muted">
                成功 {{ formatNumber(overview.successCalls) }} · 失败 {{ formatNumber(overview.failureCalls) }}
              </p>
            </template>
          </UPageCard>
        </UPageGrid>

        <div class="grid gap-4 xl:grid-cols-5">
          <UCard class="xl:col-span-3">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-semibold">
                    API 调用趋势
                  </h3>
                  <p class="mt-0.5 text-xs text-muted">
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
                <h3 class="font-semibold">
                  API 使用分布
                </h3>
                <p class="mt-0.5 text-xs text-muted">
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
                <h3 class="font-semibold">
                  最新 API 请求
                </h3>
                <p class="mt-0.5 text-xs text-muted">
                  最近 10 条调用记录
                </p>
              </div>
              <UButton
                :to="`${ADMIN_APIS_PATH}/calls`"
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
                :color="methodColor(row.original.method)"
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
