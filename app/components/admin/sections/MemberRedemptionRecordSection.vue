<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

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

const filters = reactive({
  codeId: '' as number | '',
  userId: '' as number | '',
  batchId: ''
})
const page = ref(1)
const pageSize = ref(50)
const items = ref<RedemptionRecordRow[]>([])
const total = ref(0)
const loading = ref(false)

watch(() => [props.defaultCodeId, props.defaultUserId], ([cid, uid]) => {
  if (typeof cid === 'number') filters.codeId = cid
  if (typeof uid === 'number') filters.userId = uid
  page.value = 1
  void fetchList()
}, { immediate: true })

async function fetchList() {
  loading.value = true
  try {
    const res = await $fetch<{ items: RedemptionRecordRow[], total: number }>('/api/admin/redemption-codes/redemptions', {
      query: {
        codeId: filters.codeId || undefined,
        userId: filters.userId || undefined,
        batchId: filters.batchId.trim() || undefined,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value
      }
    })
    items.value = res?.items || []
    total.value = res?.total || 0
  } catch (err) {
    console.error('failed to fetch redemption records', err)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(page, () => {
  void fetchList()
})

function apply() {
  page.value = 1
  void fetchList()
}

function reset() {
  filters.codeId = ''
  filters.userId = ''
  filters.batchId = ''
  page.value = 1
  void fetchList()
}

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
            @click="apply"
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
