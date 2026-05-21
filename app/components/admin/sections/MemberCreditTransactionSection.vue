<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface CreditTxnRow {
  id: number
  userId: number
  amount: number
  balanceAfter: number
  reason: string
  apiId: number | null
  apiCallId: number | null
  operatorId: number | null
  operatorName: string | null
  remark: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

const props = defineProps<{ defaultUserId?: number }>()

const filters = reactive({
  userId: '' as number | '',
  reason: 'all' as 'all' | 'admin_grant' | 'admin_revoke' | 'admin_reset' | 'api_charge' | 'api_refund' | 'signup_bonus' | 'redemption_code'
})
const page = ref(1)
const pageSize = ref(50)
const items = ref<CreditTxnRow[]>([])
const total = ref(0)
const loading = ref(false)

watch(() => props.defaultUserId, (val) => {
  if (typeof val === 'number') {
    filters.userId = val
    page.value = 1
    void fetchList()
  }
}, { immediate: true })

async function fetchList() {
  loading.value = true
  try {
    const res = await $fetch<{ items: CreditTxnRow[], total: number }>('/api/admin/users/credits/transactions', {
      query: {
        userId: filters.userId || undefined,
        reason: filters.reason === 'all' ? undefined : filters.reason,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value
      }
    })
    items.value = res?.items || []
    total.value = res?.total || 0
  } catch (err) {
    console.error('failed to fetch credit transactions', err)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(page, () => {
  void fetchList()
})

onMounted(() => {
  if (typeof props.defaultUserId !== 'number') void fetchList()
})

function apply() {
  page.value = 1
  void fetchList()
}

function reset() {
  filters.userId = ''
  filters.reason = 'all'
  page.value = 1
  void fetchList()
}

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const reasonItems = [
  { label: '全部原因', value: 'all' },
  { label: '管理员加积分', value: 'admin_grant' },
  { label: '管理员扣积分', value: 'admin_revoke' },
  { label: '管理员重置', value: 'admin_reset' },
  { label: 'API 调用扣费', value: 'api_charge' },
  { label: 'API 调用退款', value: 'api_refund' },
  { label: '注册赠送', value: 'signup_bonus' },
  { label: '兑换码', value: 'redemption_code' }
]

const reasonMeta: Record<string, { label: string, color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  admin_grant: { label: '管理员加', color: 'success' },
  admin_revoke: { label: '管理员扣', color: 'warning' },
  admin_reset: { label: '重置', color: 'neutral' },
  api_charge: { label: 'API 扣费', color: 'warning' },
  api_refund: { label: 'API 退款', color: 'info' },
  signup_bonus: { label: '注册赠送', color: 'success' },
  redemption_code: { label: '兑换码', color: 'success' }
}

const columns: TableColumn<CreditTxnRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'userId', header: '用户' },
  { accessorKey: 'reason', header: '原因' },
  { accessorKey: 'amount', header: '金额' },
  { accessorKey: 'balanceAfter', header: '余额' },
  { accessorKey: 'operatorName', header: '操作人' },
  { accessorKey: 'remark', header: '备注' }
]

function getReasonMeta(reason: string) {
  return reasonMeta[reason] || { label: reason, color: 'neutral' as const }
}

function amountClass(amt: number) {
  const color = amt > 0 ? 'text-success' : amt < 0 ? 'text-error' : 'text-muted'
  return `tabular-nums font-semibold ${color}`
}
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-mdi-cash-multiple"
            class="size-5 text-muted"
          />
          <h3 class="font-semibold">
            全站积分流水
          </h3>
          <span class="ml-auto text-xs text-muted tabular-nums">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <div class="flex flex-wrap items-end gap-3 mb-4">
        <UFormField
          label="用户 ID"
          class="min-w-[160px]"
        >
          <UInput
            v-model.number="filters.userId"
            type="number"
            placeholder="留空查全部"
          />
        </UFormField>
        <UFormField
          label="原因"
          class="min-w-[180px]"
        >
          <USelect
            v-model="filters.reason"
            :items="reasonItems"
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
        empty-title="暂无积分流水"
        empty-icon="i-mdi-cash-multiple"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #userId-cell="{ row }">
          <span class="font-mono text-xs">#{{ row.original.userId }}</span>
        </template>
        <template #reason-cell="{ row }">
          <UBadge
            :color="getReasonMeta(row.original.reason).color"
            variant="subtle"
          >
            {{ getReasonMeta(row.original.reason).label }}
          </UBadge>
        </template>
        <template #amount-cell="{ row }">
          <span :class="amountClass(row.original.amount)">
            {{ row.original.amount > 0 ? '+' : '' }}{{ row.original.amount.toLocaleString() }}
          </span>
        </template>
        <template #balanceAfter-cell="{ row }">
          <span class="tabular-nums text-xs text-muted">{{ row.original.balanceAfter.toLocaleString() }}</span>
        </template>
        <template #operatorName-cell="{ row }">
          <span
            v-if="row.original.operatorName"
            class="text-xs"
          >{{ row.original.operatorName }}</span>
          <span
            v-else
            class="text-xs text-muted italic"
          >系统</span>
        </template>
        <template #remark-cell="{ row }">
          <span class="text-xs text-muted truncate max-w-[260px] block">{{ row.original.remark || '-' }}</span>
        </template>
      </DashboardDataTable>
    </UCard>
  </div>
</template>
