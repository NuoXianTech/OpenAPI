<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

interface Summary { total: number, success: number, failure: number }
interface ByApiRow {
  apiId: number
  apiPath: string | null
  apiName: string | null
  httpMethod: string | null
  totalCount: number
  successCount: number
  failureCount: number
  lastCallAt: string | null
  avgLatencyMs: number | string
}
interface RecentRow {
  id: number
  apiId: number
  apiPath: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  createdAt: string
}

const UBadge = resolveComponent('UBadge')

const { data, status, refresh } = await useFetch('/api/user/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { summary: { total: 0, success: 0, failure: 0 } as Summary, byApi: [] as ByApiRow[], recent: [] as RecentRow[] } }),
})

const summary = computed<Summary>(() => data.value?.data?.summary || { total: 0, success: 0, failure: 0 })
const byApi = computed<ByApiRow[]>(() => data.value?.data?.byApi || [])
const recent = computed<RecentRow[]>(() => data.value?.data?.recent || [])

const successRate = computed(() => {
  if (!summary.value.total) return '0%'
  return `${((summary.value.success / summary.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用', value: summary.value.total.toLocaleString(), icon: 'i-mdi-chart-line' },
  { label: '成功', value: summary.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline' },
  { label: '失败', value: summary.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent' },
])

function formatDate(val: string | null) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

function statusColor(code: number): 'success' | 'warning' | 'error' | 'neutral' {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'neutral'
  if (code >= 400 && code < 500) return 'warning'
  return 'error'
}

function methodColor(method: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  switch (method) {
    case 'GET': return 'success'
    case 'POST': return 'info'
    case 'PUT':
    case 'PATCH': return 'warning'
    case 'DELETE': return 'error'
    default: return 'neutral'
  }
}

const byApiColumns: TableColumn<ByApiRow>[] = [
  {
    accessorKey: 'apiName',
    header: '接口',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium' }, row.original.apiName || `#${row.original.apiId}`),
      h('span', { class: 'font-mono text-xs text-muted' }, row.original.apiPath || '-'),
    ]),
  },
  {
    accessorKey: 'totalCount',
    header: '总数',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium' }, row.original.totalCount?.toLocaleString()),
  },
  {
    accessorKey: 'successCount',
    header: '成功',
    cell: ({ row }) => h(UBadge, { color: 'success', variant: 'subtle' }, () => (row.original.successCount || 0).toLocaleString()),
  },
  {
    accessorKey: 'failureCount',
    header: '失败',
    cell: ({ row }) => {
      const c = row.original.failureCount || 0
      return c > 0
        ? h(UBadge, { color: 'error', variant: 'subtle' }, () => c.toLocaleString())
        : h('span', { class: 'text-muted' }, '0')
    },
  },
  {
    accessorKey: 'avgLatencyMs',
    header: '平均耗时',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-xs' }, `${Math.round(Number(row.original.avgLatencyMs) || 0)} ms`),
  },
  {
    accessorKey: 'lastCallAt',
    header: '最近调用',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, formatDate(row.original.lastCallAt)),
  },
]

const recentColumns: TableColumn<RecentRow>[] = [
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, formatDate(row.original.createdAt)),
  },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, {
      color: methodColor(row.original.method),
      variant: 'subtle',
      class: 'font-mono',
    }, () => row.original.method),
  },
  {
    accessorKey: 'apiPath',
    header: '路径',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.apiPath),
  },
  {
    accessorKey: 'statusCode',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.statusCode),
      variant: 'subtle',
    }, () => row.original.statusCode),
  },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-xs' }, `${row.original.latencyMs} ms`),
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.ip || '-'),
  },
]
</script>

<template>
  <UDashboardPanel id="user-calls">
    <template #header>
      <UDashboardNavbar title="调用统计">
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
          <UserHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard
            v-for="card in overviewCards"
            :key="card.label"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted">
                  {{ card.label }}
                </p>
                <p class="text-2xl font-semibold tabular-nums mt-1">
                  {{ card.value }}
                </p>
              </div>
              <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
                <UIcon
                  :name="card.icon"
                  class="size-5 text-muted"
                />
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-chart-bar"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                各接口调用汇总
              </h3>
            </div>
          </template>
          <UTable
            :data="byApi"
            :columns="byApiColumns"
            :loading="status === 'pending'"
            :ui="{
              base: 'table-fixed',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2',
              td: 'py-2',
            }"
          />
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-history"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                最近调用
              </h3>
              <span class="ml-auto text-xs text-muted">
                显示最近 50 条
              </span>
            </div>
          </template>
          <UTable
            :data="recent"
            :columns="recentColumns"
            :loading="status === 'pending'"
            :ui="{
              base: 'table-fixed',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2',
              td: 'py-2',
            }"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
