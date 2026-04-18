<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const UBadge = resolveComponent('UBadge')

const { data, status, refresh } = await useFetch('/api/admin/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0, items: [] } }),
})

const stats = computed(() => data.value?.data || { total: 0, success: 0, failure: 0, items: [] })
const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用', value: stats.value.total.toLocaleString(), icon: 'i-mdi-chart-line' },
  { label: '成功', value: stats.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline' },
  { label: '失败', value: stats.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent' },
])

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'apiPath',
    header: '接口路径',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.apiPath || '-'),
  },
  {
    accessorKey: 'totalCount',
    header: '总调用',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-medium' }, row.original.totalCount?.toLocaleString()),
  },
  {
    accessorKey: 'successCount',
    header: '成功',
    cell: ({ row }) => h(UBadge, { color: 'success', variant: 'subtle' }, () => row.original.successCount?.toLocaleString()),
  },
  {
    accessorKey: 'failureCount',
    header: '失败',
    cell: ({ row }) => {
      const count = row.original.failureCount || 0
      return count > 0
        ? h(UBadge, { color: 'error', variant: 'subtle' }, () => count.toLocaleString())
        : h('span', { class: 'text-muted' }, '0')
    },
  },
  {
    accessorKey: 'statDate',
    header: '统计日期',
    cell: ({ row }) => formatDate(row.original.statDate),
  },
  {
    accessorKey: 'updatedAt',
    header: '更新时间',
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
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

      <!-- Stats Table -->
      <UTable
        :data="stats.items"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2',
        }"
      />
    </template>
  </UDashboardPanel>
</template>
