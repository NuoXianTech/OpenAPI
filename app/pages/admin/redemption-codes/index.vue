<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { useRedemptionCodesPage, type RedemptionCode } from '~/composables/admin/useRedemptionCodesPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  batches,
  fetchList,
  init,
  applyFilters,
  resetFilters,
  generate,
  toggle,
  remove,
  toggleBatch,
  deleteBatch,
  copyOne,
  copyAll
} = useRedemptionCodesPage()

const generateOpen = ref(false)

onMounted(() => {
  void init()
})

const statusItems = [
  { label: '全部', value: 'all' },
  { label: '可用', value: 'available' },
  { label: '已禁用', value: 'disabled' },
  { label: '已用完', value: 'used_up' },
  { label: '已过期', value: 'expired' }
]
const batchItems = computed(() => [
  { label: '全部批次', value: 'all' },
  ...batches.value.map(b => ({
    label: `${b.batchId} (${b.usedTotal}/${b.maxUsesTotal} 用 · ${b.amount} 积分)`,
    value: b.batchId
  }))
])

function formatDate(iso: string | null) {
  return formatDateTime(iso)
}

function statusOf(item: RedemptionCode): { label: string, color: 'success' | 'warning' | 'error' | 'neutral' } {
  if (!item.isEnabled) return { label: '已禁用', color: 'neutral' }
  if (item.usedCount >= item.maxUses) return { label: '已用完', color: 'warning' }
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) return { label: '已过期', color: 'error' }
  return { label: '可用', color: 'success' }
}

function getRowItems(row: RedemptionCode): DropdownMenuItem[] {
  return [{
    label: row.isEnabled ? '禁用' : '启用',
    icon: row.isEnabled ? 'i-mdi-toggle-switch-off-outline' : 'i-mdi-toggle-switch-outline',
    onSelect: () => toggle(row)
  }, {
    label: '复制兑换码',
    icon: 'i-mdi-content-copy',
    onSelect: () => copyOne(row.code)
  }, {
    type: 'separator'
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => remove(row)
  }]
}

function onBatchFilter(batchId: string) {
  filters.batchId = batchId
  applyFilters()
}

const columns: TableColumn<RedemptionCode>[] = [
  { accessorKey: 'code', header: '兑换码' },
  { accessorKey: 'amount', header: '面额' },
  { id: 'usage', header: '使用' },
  { accessorKey: 'note', header: '备注' },
  { accessorKey: 'expiresAt', header: '过期时间' },
  { id: 'status', header: '状态' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <UInput
        v-model="filters.keyword"
        class="max-w-sm"
        icon="i-mdi-magnify"
        placeholder="搜索兑换码 / 备注..."
        @keydown.enter="applyFilters"
      />

      <div class="flex flex-wrap items-center gap-1.5">
        <USelect
          v-model="filters.status"
          :items="statusItems"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
          class="min-w-28"
        />
        <USelect
          v-model="filters.batchId"
          :items="batchItems"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
          class="w-72"
        />
        <UButton
          icon="i-mdi-magnify"
          @click="applyFilters"
        >
          查询
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          @click="resetFilters"
        >
          重置
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-mdi-refresh"
          :loading="loading"
          @click="fetchList"
        >
          刷新
        </UButton>
        <UButton
          icon="i-mdi-plus"
          color="primary"
          @click="generateOpen = true"
        >
          生成兑换码
        </UButton>
      </div>
    </div>

    <AdminRedemptionCodeBatchCard
      :batches="batches"
      @filter="onBatchFilter"
      @toggle="toggleBatch"
      @delete="deleteBatch"
    />

    <DashboardDataTable
      v-model:page="page"
      :data="items"
      :columns="columns"
      :loading="loading"
      :page-size="pageSize"
      :total="total"
      empty-title="暂无兑换码"
      empty-icon="i-mdi-ticket-percent-outline"
    >
      <template #code-cell="{ row }">
        <div class="flex flex-col gap-0.5">
          <span
            class="font-mono text-sm cursor-pointer hover:text-primary"
            title="点击复制"
            @click="copyOne(row.original.code)"
          >
            {{ row.original.code }}
          </span>
          <span
            v-if="row.original.batchId"
            class="text-[11px] text-muted font-mono"
          >
            {{ row.original.batchId }}
          </span>
        </div>
      </template>
      <template #amount-cell="{ row }">
        <span class="tabular-nums font-semibold text-success">+{{ row.original.amount.toLocaleString() }}</span>
      </template>
      <template #usage-cell="{ row }">
        <span class="tabular-nums text-sm">{{ row.original.usedCount }} / {{ row.original.maxUses }}</span>
      </template>
      <template #note-cell="{ row }">
        <span class="text-xs text-muted truncate max-w-[200px] block">{{ row.original.note || '-' }}</span>
      </template>
      <template #expiresAt-cell="{ row }">
        <span class="text-xs text-muted whitespace-nowrap">
          {{ row.original.expiresAt ? formatDate(row.original.expiresAt) : '永不过期' }}
        </span>
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :color="statusOf(row.original).color"
          variant="subtle"
        >
          {{ statusOf(row.original).label }}
        </UBadge>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <DashboardRowActions :items="getRowItems(row.original)" />
      </template>
    </DashboardDataTable>

    <AdminRedemptionCodeGenerateModal
      v-model:open="generateOpen"
      :on-generate="generate"
      :on-copy-one="copyOne"
      :on-copy-all="copyAll"
    />
  </div>
</template>
