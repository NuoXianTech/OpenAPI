<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRecentCall
} from '~~/shared/types/admin-dashboard'
import { adminApiHubHref } from '~/constants/admin-sections/api-hub'
import { adminMembersHref } from '~/constants/admin-sections/members'

useHead({ title: '管理中心' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const UBadge = resolveComponent('UBadge')

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
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-xs tabular-nums text-muted' }, formatDateTime(row.original.createdAt))
  },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, {
      color: methodColor(row.original.method),
      variant: 'subtle',
      size: 'sm',
      class: 'font-mono'
    }, () => row.original.method)
  },
  {
    accessorKey: 'apiName',
    header: 'API',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('div', { class: 'truncate text-sm font-medium' }, row.original.apiName),
      h('div', { class: 'truncate text-xs font-mono text-muted' }, row.original.apiPath)
    ])
  },
  {
    accessorKey: 'statusCode',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.statusCode),
      variant: 'subtle',
      size: 'sm'
    }, () => String(row.original.statusCode))
  },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap tabular-nums text-xs' }, `${row.original.latencyMs} ms`)
  }
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
        <DashboardPageHeader
          icon="i-mdi-shield-crown-outline"
          title="管理员仪表盘"
          :description="`数据更新于 ${generatedAt}`"
        />

        <DashboardStatGrid>
          <DashboardStatCard
            label="注册用户"
            :value="formatNumber(overview.userCount)"
            icon="i-mdi-account-group-outline"
            icon-color="text-primary"
            :to="adminMembersHref('users')"
          />
          <DashboardStatCard
            label="启用 API"
            :value="`${formatNumber(overview.enabledApiCount)} / ${formatNumber(overview.totalApiCount)}`"
            icon="i-mdi-api"
            icon-color="text-success"
            :to="adminApiHubHref('governance')"
          />
          <DashboardStatCard
            label="总调用"
            :value="formatNumber(overview.totalCalls)"
            icon="i-mdi-chart-line"
            icon-color="text-info"
            :trend="overview.todayChangeRate"
            :hint="`今日 ${formatNumber(overview.todayCalls)}`"
            :to="adminApiHubHref('calls')"
          />
          <DashboardStatCard
            label="成功率"
            :value="formatRate(overview.successRate)"
            icon="i-mdi-shield-check-outline"
            icon-color="text-warning"
            :hint="`成功 ${formatNumber(overview.successCalls)} · 失败 ${formatNumber(overview.failureCalls)}`"
            :to="adminApiHubHref('calls')"
          />
        </DashboardStatGrid>

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
                :to="adminApiHubHref('calls')"
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
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
