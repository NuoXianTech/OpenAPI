<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRecentCall,
} from '~~/shared/types/admin-dashboard'

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
      todayChangeRate: 0,
    },
    trend: [],
    distribution: [],
    recentCalls: [],
    generatedAt: new Date(0).toISOString(),
  }
}

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 14 天', value: 14 },
  { label: '近 30 天', value: 30 },
]
const selectedRange = ref<number>(7)

const { data, status, refresh } = useLazyFetch<AdminDashboardData>('/api/admin/dashboard', {
  query: computed(() => ({ days: selectedRange.value })),
  default: () => createEmptyData(),
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

const overviewCards = computed(() => [
  {
    label: '注册用户',
    value: formatNumber(overview.value.userCount),
    icon: 'i-mdi-account-group-outline',
    color: 'text-primary',
    to: '/admin/users',
  },
  {
    label: '启用 API',
    value: `${formatNumber(overview.value.enabledApiCount)} / ${formatNumber(overview.value.totalApiCount)}`,
    icon: 'i-mdi-api',
    color: 'text-success',
    to: '/admin/apis',
  },
  {
    label: '总调用',
    value: formatNumber(overview.value.totalCalls),
    icon: 'i-mdi-chart-line',
    color: 'text-info',
    to: '/admin/calls',
    trend: overview.value.todayChangeRate,
    hint: `今日 ${formatNumber(overview.value.todayCalls)}`,
  },
  {
    label: '成功率',
    value: formatRate(overview.value.successRate),
    icon: 'i-mdi-shield-check-outline',
    color: 'text-warning',
    to: '/admin/calls',
    hint: `成功 ${formatNumber(overview.value.successCalls)} · 失败 ${formatNumber(overview.value.failureCalls)}`,
  },
])

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
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-xs tabular-nums text-muted' }, formatDateTime(row.original.createdAt)),
  },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, {
      color: methodColor(row.original.method),
      variant: 'subtle',
      size: 'sm',
      class: 'font-mono',
    }, () => row.original.method),
  },
  {
    accessorKey: 'apiName',
    header: 'API',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('div', { class: 'truncate text-sm font-medium' }, row.original.apiName),
      h('div', { class: 'truncate text-xs font-mono text-muted' }, row.original.apiPath),
    ]),
  },
  {
    accessorKey: 'statusCode',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.statusCode),
      variant: 'subtle',
      size: 'sm',
    }, () => String(row.original.statusCode)),
  },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap tabular-nums text-xs' }, `${row.original.latencyMs} ms`),
  },
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
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-mdi-refresh"
            :loading="status === 'pending'"
            @click="refresh()"
          />
          <AdminHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UCard>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <span class="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UIcon
                  name="i-mdi-shield-crown-outline"
                  class="size-6"
                />
              </span>
              <div>
                <div class="text-lg font-semibold">
                  管理员仪表盘
                </div>
                <div class="text-sm text-muted">
                  数据更新于 {{ generatedAt }}
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="card in overviewCards"
            :key="card.label"
            :to="card.to"
            class="block"
          >
            <UCard class="h-full transition-all hover:border-primary/40 hover:shadow">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm text-muted">
                    {{ card.label }}
                  </p>
                  <p class="mt-1 truncate text-2xl font-semibold tabular-nums">
                    {{ card.value }}
                  </p>
                  <p
                    v-if="card.hint"
                    class="mt-1 truncate text-xs text-muted"
                  >
                    <span
                      v-if="card.trend !== undefined"
                      :class="card.trend >= 0 ? 'text-success' : 'text-error'"
                      class="mr-1 inline-flex items-center gap-0.5"
                    >
                      <UIcon
                        :name="card.trend >= 0 ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
                        class="size-3.5"
                      />
                      {{ card.trend >= 0 ? '+' : '' }}{{ card.trend.toFixed(1) }}%
                    </span>
                    {{ card.hint }}
                  </p>
                </div>
                <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
                  <UIcon
                    :name="card.icon"
                    :class="card.color"
                    class="size-5"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>

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
                to="/admin/calls"
                variant="link"
                size="sm"
                trailing-icon="i-mdi-arrow-right"
              >
                查看完整日志
              </UButton>
            </div>
          </template>

          <UTable
            :data="recentCalls"
            :columns="recentColumns"
            :loading="status === 'pending' && recentCalls.length === 0"
            empty="暂无请求日志"
            :ui="{
              base: 'table-auto',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2 text-xs uppercase tracking-wide',
              td: 'py-2.5',
            }"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
