<script setup lang="ts">
import { VisAxis, VisArea, VisCrosshair, VisDonut, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  AdminDashboardData,
  AdminDashboardRecentCall,
  AdminDashboardResponse,
  AdminDashboardTrendPoint,
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

const { data, status, refresh } = await useFetch<AdminDashboardResponse>('/api/admin/dashboard', {
  query: computed(() => ({ days: selectedRange.value })),
  default: () => ({
    code: 0,
    msg: '',
    data: createEmptyData(),
    timestamp: Date.now(),
  }),
})

const dashboard = computed(() => data.value?.data || createEmptyData())
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
    key: 'users',
    label: '注册用户总数',
    value: formatNumber(overview.value.userCount),
    icon: 'i-mdi-account-group-outline',
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  },
  {
    key: 'enabledApis',
    label: '启用的 API 数量',
    value: formatNumber(overview.value.enabledApiCount),
    hint: `共 ${formatNumber(overview.value.totalApiCount)} 个接口`,
    icon: 'i-mdi-api',
    accent: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
  },
  {
    key: 'totalCalls',
    label: '总 API 调用次数',
    value: formatNumber(overview.value.totalCalls),
    icon: 'i-mdi-chart-line',
    accent: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    trend: overview.value.todayChangeRate,
    trendLabel: `今日 ${formatNumber(overview.value.todayCalls)} · ${overview.value.todayChangeRate >= 0 ? '+' : ''}${overview.value.todayChangeRate.toFixed(1)}%`,
  },
  {
    key: 'successRate',
    label: '请求成功率',
    value: formatRate(overview.value.successRate),
    icon: 'i-mdi-shield-check-outline',
    accent: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    hint: `成功 ${formatNumber(overview.value.successCalls)} / 失败 ${formatNumber(overview.value.failureCalls)}`,
  },
])

function toShortDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5) : value
}

interface TrendRow {
  label: string
  total: number
  success: number
  failure: number
  raw: AdminDashboardTrendPoint
}

const trendRows = computed<TrendRow[]>(() => trend.value.map(item => ({
  label: toShortDate(item.date),
  total: item.totalCalls,
  success: item.successCalls,
  failure: item.failureCalls,
  raw: item,
})))

const xAccessor = (_: TrendRow, i: number) => i
const totalAccessor = (d: TrendRow) => d.total
const successAccessor = (d: TrendRow) => d.success
const failureAccessor = (d: TrendRow) => d.failure

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick !== 'number') return String(tick)
  const idx = Math.max(0, Math.min(trendRows.value.length - 1, Math.round(tick)))
  return trendRows.value[idx]?.label || ''
}
const yTickFormat = (tick: number | Date) => typeof tick === 'number' ? Math.round(tick).toString() : ''

const trendTooltipTemplate = (d: TrendRow) => {
  return `<div style="font-size:12px;line-height:1.5">
    <div style="font-weight:600;margin-bottom:4px">${d.raw.date}</div>
    <div>总调用：${formatNumber(d.total)}</div>
    <div>成功：${formatNumber(d.success)}</div>
    <div>失败：${formatNumber(d.failure)}</div>
  </div>`
}

const donutData = computed(() => distribution.value.map(item => item.totalCalls))
const donutColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const donutTotal = computed(() => donutData.value.reduce((a, b) => a + b, 0))

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
    cell: ({ row }) => h('span', { class: 'text-xs tabular-nums text-muted' }, formatDateTime(row.original.createdAt)),
  },
  {
    accessorKey: 'id',
    header: '请求 ID',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, `#${row.original.id}`),
  },
  {
    accessorKey: 'apiName',
    header: 'API 名称',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('div', { class: 'text-sm font-medium truncate' }, row.original.apiName),
      h('div', { class: 'text-xs font-mono text-muted truncate' }, row.original.apiPath),
    ]),
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
    accessorKey: 'statusCode',
    header: '状态码',
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.statusCode),
      variant: 'subtle',
      size: 'sm',
    }, () => String(row.original.statusCode)),
  },
  {
    accessorKey: 'latencyMs',
    header: '响应时间',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-sm' }, `${row.original.latencyMs} ms`),
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
      <!-- Overview Stats -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard
          v-for="card in overviewCards"
          :key="card.key"
          :ui="{ body: 'p-5' }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                {{ card.label }}
              </p>
              <p class="mt-2 text-2xl font-semibold tabular-nums">
                {{ card.value }}
              </p>
              <p
                v-if="card.hint || card.trendLabel"
                class="mt-1 text-xs text-muted truncate"
              >
                <span
                  v-if="card.trendLabel"
                  :class="(card.trend ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                >
                  <UIcon
                    :name="(card.trend ?? 0) >= 0 ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
                    class="size-3.5 align-text-bottom"
                  />
                  {{ card.trendLabel }}
                </span>
                <template v-else>
                  {{ card.hint }}
                </template>
              </p>
            </div>
            <div
              class="flex items-center justify-center size-10 rounded-lg shrink-0"
              :class="card.accent"
            >
              <UIcon
                :name="card.icon"
                class="size-5"
              />
            </div>
          </div>
        </UCard>
      </section>

      <!-- Charts -->
      <section class="grid gap-4 xl:grid-cols-5">
        <UCard
          class="xl:col-span-3"
          :ui="{ body: 'p-5' }"
        >
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold">
                  API 调用趋势
                </h3>
                <p class="text-xs text-muted mt-0.5">
                  按天聚合总调用、成功与失败次数
                </p>
              </div>
              <USelect
                v-model="selectedRange"
                :items="rangeOptions"
                value-key="value"
                class="w-32"
                size="sm"
              />
            </div>
          </template>

          <ClientOnly>
            <div class="relative h-[300px]">
              <VisXYContainer
                :data="trendRows"
                :padding="{ left: 8, right: 16, top: 16, bottom: 24 }"
              >
                <VisArea
                  :x="xAccessor"
                  :y="totalAccessor"
                  color="var(--ui-primary)"
                  :opacity="0.08"
                />
                <VisLine
                  :x="xAccessor"
                  :y="totalAccessor"
                  color="var(--ui-primary)"
                  :line-width="2.5"
                />
                <VisLine
                  :x="xAccessor"
                  :y="successAccessor"
                  color="var(--green)"
                  :line-width="2"
                />
                <VisLine
                  :x="xAccessor"
                  :y="failureAccessor"
                  color="var(--red)"
                  :line-width="2"
                />
                <VisAxis
                  type="y"
                  :tick-line="false"
                  :domain-line="false"
                  :grid-line="true"
                  :tick-format="yTickFormat"
                />
                <VisAxis
                  type="x"
                  :tick-line="false"
                  :domain-line="false"
                  :grid-line="false"
                  :tick-format="xTickFormat"
                  :num-ticks="Math.min(Math.max(trendRows.length, 1), 8)"
                />
                <VisCrosshair :template="trendTooltipTemplate" />
                <VisTooltip />
              </VisXYContainer>
              <div
                v-if="trendRows.length === 0"
                class="absolute inset-0 rounded-lg border border-dashed border-default bg-muted/20 flex items-center justify-center text-sm text-muted"
              >
                暂无调用数据
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-3 text-xs">
              <div class="inline-flex items-center gap-2">
                <span
                  class="h-2 w-3 rounded-full"
                  style="background: var(--ui-primary)"
                />
                <span class="text-muted">总调用</span>
              </div>
              <div class="inline-flex items-center gap-2">
                <span
                  class="h-2 w-3 rounded-full"
                  style="background: var(--green)"
                />
                <span class="text-muted">成功</span>
              </div>
              <div class="inline-flex items-center gap-2">
                <span
                  class="h-2 w-3 rounded-full"
                  style="background: var(--red)"
                />
                <span class="text-muted">失败</span>
              </div>
            </div>

            <template #fallback>
              <div class="h-[300px] w-full rounded-lg bg-muted/20" />
            </template>
          </ClientOnly>
        </UCard>

        <UCard
          class="xl:col-span-2"
          :ui="{ body: 'p-5' }"
        >
          <template #header>
            <div>
              <h3 class="font-semibold">
                API 使用分布
              </h3>
              <p class="text-xs text-muted mt-0.5">
                Top 6 高频调用接口
              </p>
            </div>
          </template>

          <ClientOnly>
            <div class="relative min-h-[260px] flex items-center gap-5">
              <div class="relative size-44 shrink-0">
                <VisDonut
                  :data="donutData"
                  :arc-width="24"
                  :pad-angle="0.01"
                  :color="(_d: number, i: number) => donutColors[i % donutColors.length]"
                />
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-xs text-muted">总计</span>
                  <span class="text-xl font-semibold tabular-nums">{{ formatNumber(donutTotal) }}</span>
                </div>
              </div>
              <ul
                v-if="distribution.length > 0"
                class="flex-1 space-y-2 min-w-0"
              >
                <li
                  v-for="(item, i) in distribution"
                  :key="item.apiId"
                  class="flex items-center gap-2 text-xs"
                >
                  <span
                    class="h-2 w-2 rounded-full shrink-0"
                    :style="{ background: donutColors[i % donutColors.length] }"
                  />
                  <span
                    class="flex-1 truncate"
                    :title="item.name"
                  >{{ item.name }}</span>
                  <span class="tabular-nums text-muted shrink-0">{{ formatNumber(item.totalCalls) }}</span>
                </li>
              </ul>
              <div
                v-if="distribution.length === 0"
                class="absolute inset-0 rounded-lg border border-dashed border-default bg-muted/20 flex items-center justify-center text-sm text-muted"
              >
                暂无分布数据
              </div>
            </div>

            <template #fallback>
              <div class="h-[260px] w-full rounded-lg bg-muted/20" />
            </template>
          </ClientOnly>
        </UCard>
      </section>

      <!-- Recent Calls Table -->
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">
                最新 API 请求日志
              </h3>
              <p class="text-xs text-muted mt-0.5">
                显示最近 10 条 API 调用记录 · 数据更新于 {{ generatedAt }}
              </p>
            </div>
            <UButton
              to="/admin/calls"
              variant="link"
              size="sm"
              trailing-icon="i-mdi-arrow-right"
            >
              查看调用统计
            </UButton>
          </div>
        </template>

        <UTable
          :data="recentCalls"
          :columns="recentColumns"
          :loading="status === 'pending'"
          empty="暂无请求日志"
          :ui="{
            base: 'table-auto',
            thead: '[&>tr]:bg-elevated/60',
            th: 'py-2 text-xs uppercase tracking-wide',
            td: 'py-2.5',
          }"
        />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
