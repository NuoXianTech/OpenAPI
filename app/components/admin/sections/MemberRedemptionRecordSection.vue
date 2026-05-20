<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'

interface RedemptionRecordRow {
  id: number
  codeId: number
  code: string | null
  batchId: string | null
  userId: number
  username: string | null
  amount: number
  ip: string | null
  redeemedAt: string
}

const props = defineProps<{ defaultCodeId?: number, defaultUserId?: number }>()

const pageSize = 50
const {
  filters,
  page,
  items,
  total,
  status,
  applyFilters,
  reset
} = useAdminPagedList<{ codeId: number | '', userId: number | '', batchId: string }, RedemptionRecordRow>({
  path: '/api/admin/redemption-codes/redemptions',
  defaultFilters: { codeId: '', userId: '', batchId: '' },
  defaultPageSize: pageSize,
  immediate: false,
  buildQuery: (f, p) => ({
    codeId: f.codeId || undefined,
    userId: f.userId || undefined,
    batchId: f.batchId.trim() || undefined,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

watch(() => [props.defaultCodeId, props.defaultUserId], ([cid, uid]) => {
  if (typeof cid === 'number') filters.codeId = cid
  if (typeof uid === 'number') filters.userId = uid
  void applyFilters()
}, { immediate: true })

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<RedemptionRecordRow>[] = [
  {
    accessorKey: 'redeemedAt',
    header: '兑换时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.redeemedAt))
  },
  {
    accessorKey: 'code',
    header: '兑换码',
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', { class: 'font-mono text-xs' }, row.original.code || `#${row.original.codeId}`),
      row.original.batchId ? h('span', { class: 'font-mono text-[11px] text-muted' }, row.original.batchId) : null
    ].filter(Boolean))
  },
  {
    accessorKey: 'username',
    header: '用户',
    cell: ({ row }) => h('div', { class: 'flex flex-col text-xs' }, [
      h('span', null, row.original.username || '-'),
      h('span', { class: 'text-muted font-mono' }, `#${row.original.userId}`)
    ])
  },
  {
    accessorKey: 'amount',
    header: '到账积分',
    cell: ({ row }) => h('span', { class: 'tabular-nums font-semibold text-success' }, `+${row.original.amount.toLocaleString()}`)
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.ip || '-')
  }
]
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-mdi-clipboard-check-outline"
            class="size-5 text-muted"
          />
          <h3 class="font-semibold">
            兑换记录
          </h3>
          <span class="ml-auto text-xs text-muted tabular-nums">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <div class="flex flex-wrap items-end gap-3 mb-4">
        <UFormField
          label="兑换码 ID"
          class="min-w-[140px]"
        >
          <UInput
            v-model.number="filters.codeId"
            type="number"
            placeholder="留空"
          />
        </UFormField>
        <UFormField
          label="批次 ID"
          class="min-w-[200px]"
        >
          <UInput
            v-model="filters.batchId"
            placeholder="留空"
          />
        </UFormField>
        <UFormField
          label="用户 ID"
          class="min-w-[140px]"
        >
          <UInput
            v-model.number="filters.userId"
            type="number"
            placeholder="留空"
          />
        </UFormField>
        <div class="flex gap-2">
          <UButton
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            @click="reset"
          >
            重置
          </UButton>
        </div>
      </div>

      <DashboardDataTable
        v-model:page="page"
        :data="items"
        :columns="columns"
        :loading="loading"
        :page-size="pageSize"
        :total="total"
        empty-title="暂无兑换记录"
        empty-icon="i-mdi-clipboard-check-outline"
      />
    </UCard>
  </div>
</template>
