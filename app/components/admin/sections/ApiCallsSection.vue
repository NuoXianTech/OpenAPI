<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'

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
  { accessorKey: 'apiPath', header: '接口路径' },
  { accessorKey: 'totalCount', header: '总调用' },
  { accessorKey: 'successCount', header: '成功' },
  { accessorKey: 'failureCount', header: '失败' },
  { accessorKey: 'statDate', header: '统计日期' },
  { accessorKey: 'updatedAt', header: '更新时间' }
]

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

const logPageSize = 50
const {
  filters: logFilters,
  page: logPage,
  items: logItems,
  total: logTotal,
  status: logStatus,
  applyFilters: applyLogFilters,
  reset: resetLogFilters
} = useAdminPagedList<{ userId: number | '', status: 'all' | 'success' | 'failure' }, AdminCallRow>({
  path: '/api/admin/calls/list',
  defaultFilters: { userId: '', status: 'all' },
  defaultPageSize: logPageSize,
  buildQuery: (f, p) => ({
    userId: f.userId || undefined,
    status: f.status === 'all' ? undefined : f.status,
    limit: p.limit,
    offset: p.offset
  })
})

const logLoading = computed(() => logStatus.value === 'pending')

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
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'method', header: '方法' },
  { accessorKey: 'apiName', header: '服务' },
  { accessorKey: 'userName', header: '用户' },
  { accessorKey: 'statusCode', header: '状态' },
  { accessorKey: 'creditsCost', header: '扣除积分' },
  { accessorKey: 'latencyMs', header: '耗时' },
  { accessorKey: 'apiKeyName', header: 'API Key' },
  { accessorKey: 'ip', header: 'IP' },
  { id: 'error', header: '错误信息' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-end">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-mdi-refresh"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <UPageGrid class="sm:grid-cols-2 lg:grid-cols-4">
      <UPageCard
        v-for="card in overviewCards"
        :key="card.label"
        :icon="card.icon"
        :title="card.value"
        :description="card.label"
        variant="subtle"
        class="[&_h3]:tabular-nums"
      />
    </UPageGrid>

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
      >
        <template #apiPath-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.apiPath || '-' }}</span>
        </template>
        <template #totalCount-cell="{ row }">
          <span class="tabular-nums font-medium">{{ row.original.totalCount?.toLocaleString() }}</span>
        </template>
        <template #successCount-cell="{ row }">
          <UBadge
            color="success"
            variant="subtle"
          >
            {{ row.original.successCount?.toLocaleString() }}
          </UBadge>
        </template>
        <template #failureCount-cell="{ row }">
          <UBadge
            v-if="(row.original.failureCount || 0) > 0"
            color="error"
            variant="subtle"
          >
            {{ (row.original.failureCount || 0).toLocaleString() }}
          </UBadge>
          <span
            v-else
            class="text-muted"
          >0</span>
        </template>
        <template #statDate-cell="{ row }">
          {{ formatDate(row.original.statDate || '') }}
        </template>
        <template #updatedAt-cell="{ row }">
          {{ formatDate(row.original.updatedAt || '') }}
        </template>
      </DashboardDataTable>
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
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #method-cell="{ row }">
          <UBadge
            :color="methodColor(row.original.method)"
            variant="subtle"
            class="font-mono"
          >
            {{ row.original.method }}
          </UBadge>
        </template>
        <template #apiName-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium text-sm">{{ row.original.apiName || '-' }}</span>
            <span class="font-mono text-xs text-muted">{{ row.original.apiPath }}</span>
          </div>
        </template>
        <template #userName-cell="{ row }">
          <div
            v-if="row.original.userId"
            class="flex flex-col text-xs"
          >
            <span>{{ row.original.userName || '-' }}</span>
            <span class="text-muted">#{{ row.original.userId }}</span>
          </div>
          <span
            v-else
            class="text-xs text-muted italic"
          >匿名</span>
        </template>
        <template #statusCode-cell="{ row }">
          <div class="flex items-center gap-1">
            <UBadge
              :color="statusColor(row.original.statusCode)"
              variant="subtle"
            >
              {{ row.original.statusCode }}
            </UBadge>
            <UBadge
              v-if="row.original.statusCode >= 200 && row.original.statusCode < 400"
              color="success"
              variant="soft"
              size="sm"
            >
              成功
            </UBadge>
            <UBadge
              v-else
              color="error"
              variant="soft"
              size="sm"
            >
              失败
            </UBadge>
          </div>
        </template>
        <template #creditsCost-cell="{ row }">
          <UBadge
            v-if="row.original.creditsCost > 0"
            color="warning"
            variant="subtle"
            class="tabular-nums"
          >
            -{{ row.original.creditsCost }}
          </UBadge>
          <span
            v-else
            class="text-xs text-muted"
          >免费</span>
        </template>
        <template #latencyMs-cell="{ row }">
          <span class="tabular-nums text-xs">{{ row.original.latencyMs }} ms</span>
        </template>
        <template #apiKeyName-cell="{ row }">
          <span
            v-if="row.original.apiKeyId"
            class="text-xs"
          >{{ row.original.apiKeyName || `#${row.original.apiKeyId}` }}</span>
          <span
            v-else
            class="text-xs text-muted italic"
          >未携带</span>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
        </template>
        <template #error-cell="{ row }">
          <div
            v-if="row.original.errorCode || row.original.errorMessage"
            class="flex flex-col text-xs"
          >
            <span
              v-if="row.original.errorCode"
              class="font-mono text-error"
            >{{ row.original.errorCode }}</span>
            <span
              v-if="row.original.errorMessage"
              class="text-muted truncate max-w-[200px]"
            >{{ row.original.errorMessage }}</span>
          </div>
          <span
            v-else
            class="text-muted"
          >-</span>
        </template>
      </DashboardDataTable>
    </UCard>
  </div>
</template>
