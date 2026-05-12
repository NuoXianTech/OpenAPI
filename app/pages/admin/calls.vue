<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const UBadge = resolveComponent('UBadge')

interface AggregateRow {
  apiPath?: string | null
  totalCount?: number | null
  successCount?: number | null
  failureCount?: number | null
  statDate?: string
  updatedAt?: string
}

const { data, status, refresh } = useLazyFetch<{ total: number, success: number, failure: number, items: AggregateRow[] }>('/api/admin/calls/stats', {
  default: () => ({ total: 0, success: 0, failure: 0, items: [] })
})

const stats = computed(() => data.value || { total: 0, success: 0, failure: 0, items: [] })
const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用', value: stats.value.total.toLocaleString(), icon: 'i-mdi-chart-line' },
  { label: '成功', value: stats.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline' },
  { label: '失败', value: stats.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent' }
])

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const aggregateColumns: TableColumn<AggregateRow>[] = [
  {
    accessorKey: 'apiPath',
    header: '接口路径',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.apiPath || '-')
  },
  {
    accessorKey: 'totalCount',
    header: '总调用',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium' }, row.original.totalCount?.toLocaleString())
  },
  {
    accessorKey: 'successCount',
    header: '成功',
    cell: ({ row }) => h(UBadge, { color: 'success', variant: 'subtle' }, () => row.original.successCount?.toLocaleString())
  },
  {
    accessorKey: 'failureCount',
    header: '失败',
    cell: ({ row }) => {
      const count = row.original.failureCount || 0
      return count > 0
        ? h(UBadge, { color: 'error', variant: 'subtle' }, () => count.toLocaleString())
        : h('span', { class: 'text-muted' }, '0')
    }
  },
  {
    accessorKey: 'statDate',
    header: '统计日期',
    cell: ({ row }) => formatDate(row.original.statDate || '')
  },
  {
    accessorKey: 'updatedAt',
    header: '更新时间',
    cell: ({ row }) => formatDate(row.original.updatedAt || '')
  }
]

// ----- 调用明细日志 -----
interface AdminCallRow {
  id: number
  apiId: number
  apiName: string | null
  apiPath: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  userId: number | null
  userName: string | null
  errorCode: string | null
  errorMessage: string | null
  creditsCost: number
  createdAt: string
}

const logFilters = reactive({
  userId: '' as number | '',
  status: 'all' as 'all' | 'success' | 'failure'
})
const logPage = ref(1)
const logPageSize = ref(50)
const logItems = ref<AdminCallRow[]>([])
const logTotal = ref(0)
const logLoading = ref(false)

async function fetchLogs() {
  logLoading.value = true
  try {
    const res = await $fetch<{ items: AdminCallRow[], total: number }>('/api/admin/calls/list', {
      query: {
        userId: logFilters.userId || undefined,
        status: logFilters.status === 'all' ? undefined : logFilters.status,
        limit: logPageSize.value,
        offset: (logPage.value - 1) * logPageSize.value
      }
    })
    logItems.value = res?.items || []
    logTotal.value = res?.total || 0
  } catch (err) {
    console.error('failed to fetch admin calls list', err)
    logItems.value = []
    logTotal.value = 0
  } finally {
    logLoading.value = false
  }
}

watch(logPage, () => {
  void fetchLogs()
})

onMounted(() => {
  void fetchLogs()
})

function applyLogFilters() {
  logPage.value = 1
  void fetchLogs()
}

function resetLogFilters() {
  logFilters.userId = ''
  logFilters.status = 'all'
  logPage.value = 1
  void fetchLogs()
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

const statusSelectItems = [
  { label: '全部状态', value: 'all' },
  { label: '成功（2xx/3xx）', value: 'success' },
  { label: '失败（4xx/5xx）', value: 'failure' }
]

const logColumns: TableColumn<AdminCallRow>[] = [
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.createdAt))
  },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, {
      color: methodColor(row.original.method),
      variant: 'subtle',
      class: 'font-mono'
    }, () => row.original.method)
  },
  {
    accessorKey: 'apiName',
    header: '服务',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-sm' }, row.original.apiName || '-'),
      h('span', { class: 'font-mono text-xs text-muted' }, row.original.apiPath)
    ])
  },
  {
    accessorKey: 'userName',
    header: '用户',
    cell: ({ row }) => row.original.userId
      ? h('div', { class: 'flex flex-col text-xs' }, [
          h('span', null, row.original.userName || '-'),
          h('span', { class: 'text-muted' }, `#${row.original.userId}`)
        ])
      : h('span', { class: 'text-xs text-muted italic' }, '匿名')
  },
  {
    accessorKey: 'statusCode',
    header: '状态',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1' }, [
      h(UBadge, {
        color: statusColor(row.original.statusCode),
        variant: 'subtle'
      }, () => row.original.statusCode),
      row.original.statusCode >= 200 && row.original.statusCode < 400
        ? h(UBadge, { color: 'success', variant: 'soft', size: 'sm' }, () => '成功')
        : h(UBadge, { color: 'error', variant: 'soft', size: 'sm' }, () => '失败')
    ])
  },
  {
    accessorKey: 'creditsCost',
    header: '扣除积分',
    cell: ({ row }) => row.original.creditsCost > 0
      ? h(UBadge, { color: 'warning', variant: 'subtle', class: 'tabular-nums' }, () => `-${row.original.creditsCost}`)
      : h('span', { class: 'text-xs text-muted' }, '免费')
  },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-xs' }, `${row.original.latencyMs} ms`)
  },
  {
    accessorKey: 'apiKeyName',
    header: 'API Key',
    cell: ({ row }) => row.original.apiKeyId
      ? h('span', { class: 'text-xs' }, row.original.apiKeyName || `#${row.original.apiKeyId}`)
      : h('span', { class: 'text-xs text-muted italic' }, '未携带')
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.ip || '-')
  },
  {
    id: 'error',
    header: '错误信息',
    cell: ({ row }) => row.original.errorCode || row.original.errorMessage
      ? h('div', { class: 'flex flex-col text-xs' }, [
          row.original.errorCode ? h('span', { class: 'font-mono text-error' }, row.original.errorCode) : null,
          row.original.errorMessage ? h('span', { class: 'text-muted truncate max-w-[200px]' }, row.original.errorMessage) : null
        ].filter(Boolean))
      : h('span', { class: 'text-muted' }, '-')
  }
]
</script>

<template>
  <UDashboardPanel id="admin-calls">
    <template #header>
      <UDashboardNavbar title="调用统计">
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
        <DashboardStatGrid>
          <DashboardStatCard
            v-for="card in overviewCards"
            :key="card.label"
            :label="card.label"
            :value="card.value"
            :icon="card.icon"
          />
        </DashboardStatGrid>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-chart-bar"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                按 API 聚合（按日）
              </h3>
            </div>
          </template>
          <DashboardDataTable
            :data="stats.items"
            :columns="aggregateColumns"
            :loading="status === 'pending'"
            empty-title="暂无聚合数据"
            empty-icon="i-mdi-chart-bar"
          />
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2 flex-wrap">
              <UIcon
                name="i-mdi-history"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                调用明细日志（含扣费）
              </h3>
            </div>
          </template>

          <div class="flex flex-wrap items-end gap-3 mb-4">
            <UFormField
              label="用户 ID"
              class="min-w-[160px]"
            >
              <UInput
                v-model.number="logFilters.userId"
                type="number"
                placeholder="留空查全部"
              />
            </UFormField>
            <UFormField
              label="状态"
              class="min-w-[160px]"
            >
              <USelect
                v-model="logFilters.status"
                :items="statusSelectItems"
              />
            </UFormField>
            <div class="flex gap-2">
              <UButton
                icon="i-mdi-magnify"
                @click="applyLogFilters"
              >
                查询
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                @click="resetLogFilters"
              >
                重置
              </UButton>
            </div>
          </div>

          <DashboardDataTable
            v-model:page="logPage"
            :data="logItems"
            :columns="logColumns"
            :loading="logLoading"
            :page-size="logPageSize"
            :total="logTotal"
            empty-title="暂无调用记录"
            empty-icon="i-mdi-history"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
