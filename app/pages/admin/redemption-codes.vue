<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { useRedemptionCodesPage, type RedemptionCode } from '~/composables/admin/useRedemptionCodesPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  batches,
  totalPages,
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
  copyAll,
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
  { label: '已过期', value: 'expired' },
]
const batchItems = computed(() => [
  { label: '全部批次', value: 'all' },
  ...batches.value.map(b => ({
    label: `${b.batchId} (${b.usedTotal}/${b.maxUsesTotal} 用 · ${b.amount} 积分)`,
    value: b.batchId,
  })),
])

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  }
  catch {
    return iso
  }
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
    onSelect: () => toggle(row),
  }, {
    label: '复制兑换码',
    icon: 'i-mdi-content-copy',
    onSelect: () => copyOne(row.code),
  }, {
    type: 'separator',
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => remove(row),
  }]
}

function onBatchFilter(batchId: string) {
  filters.batchId = batchId
  applyFilters()
}

const columns: TableColumn<RedemptionCode>[] = [
  {
    accessorKey: 'code',
    header: '兑换码',
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', {
        class: 'font-mono text-sm cursor-pointer hover:text-primary',
        onClick: () => copyOne(row.original.code),
        title: '点击复制',
      }, row.original.code),
      row.original.batchId
        ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.batchId)
        : null,
    ].filter(Boolean)),
  },
  {
    accessorKey: 'amount',
    header: '面额',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-semibold text-success' }, `+${row.original.amount.toLocaleString()}`),
  },
  {
    id: 'usage',
    header: '使用',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-sm' },
      `${row.original.usedCount} / ${row.original.maxUses}`),
  },
  {
    accessorKey: 'note',
    header: '备注',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted truncate max-w-[200px] block' }, row.original.note || '-'),
  },
  {
    accessorKey: 'expiresAt',
    header: '过期时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' },
      row.original.expiresAt ? formatDate(row.original.expiresAt) : '永不过期'),
  },
  {
    id: 'status',
    header: '状态',
    cell: ({ row }) => {
      const s = statusOf(row.original)
      return h(UBadge, { color: s.color, variant: 'subtle' }, () => s.label)
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.createdAt)),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
    }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-redemption-codes">
    <template #header>
      <UDashboardNavbar title="兑换码">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            color="primary"
            @click="generateOpen = true"
          >
            生成兑换码
          </UButton>
          <DashboardHeaderActions
            :on-refresh="fetchList"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="filters.status"
            :items="statusItems"
            size="sm"
            class="w-32"
          />
          <USelect
            v-model="filters.batchId"
            :items="batchItems"
            size="sm"
            class="w-72"
          />
          <UInput
            v-model="filters.keyword"
            icon="i-mdi-magnify"
            placeholder="搜索兑换码 / 备注..."
            size="sm"
            class="max-w-xs"
            @keydown.enter="applyFilters"
          />
          <UButton
            size="sm"
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            @click="resetFilters"
          >
            重置
          </UButton>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <AdminRedemptionCodeBatchCard
          :batches="batches"
          @filter="onBatchFilter"
          @toggle="toggleBatch"
          @delete="deleteBatch"
        />

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-ticket-percent-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                兑换码列表
              </h3>
              <span class="ml-auto text-xs text-muted tabular-nums">
                共 {{ total.toLocaleString() }} 条
              </span>
            </div>
          </template>
          <UTable
            :data="items"
            :columns="columns"
            :loading="loading"
            empty="暂无兑换码"
            :ui="{
              base: 'table-fixed',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2',
              td: 'py-2 align-middle',
            }"
          />
          <div
            v-if="total > pageSize"
            class="flex items-center justify-between pt-3 border-t border-default mt-3"
          >
            <span class="text-xs text-muted">
              第 {{ page }} / {{ totalPages }} 页
            </span>
            <div class="flex gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-mdi-chevron-left"
                :disabled="page <= 1"
                @click="page = Math.max(1, page - 1)"
              >
                上一页
              </UButton>
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                trailing-icon="i-mdi-chevron-right"
                :disabled="page >= totalPages"
                @click="page = Math.min(totalPages, page + 1)"
              >
                下一页
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <AdminRedemptionCodeGenerateModal
        v-model:open="generateOpen"
        :on-generate="generate"
        :on-copy-one="copyOne"
        :on-copy-all="copyAll"
      />
    </template>
  </UDashboardPanel>
</template>
