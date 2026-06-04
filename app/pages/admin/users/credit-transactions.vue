<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

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

const filters = reactive({
  userId: '' as number | '',
  reason: 'all' as 'all' | 'admin_grant' | 'admin_revoke' | 'admin_reset' | 'api_charge' | 'api_refund' | 'signup_bonus' | 'redemption_code'
})
const page = ref(1)
const pageSize = ref(50)
const items = ref<CreditTxnRow[]>([])
const total = ref(0)
const loading = ref(false)

const activeFilterCount = computed(() => [
  filters.userId !== '',
  filters.reason !== 'all'
].filter(Boolean).length)

const logMetricItems = computed(() => [
  {
    label: '总记录',
    value: total.value.toLocaleString(),
    icon: 'i-mdi-cash-multiple',
    tone: 'text-primary'
  },
  {
    label: '本页',
    value: items.value.length.toLocaleString(),
    icon: 'i-mdi-format-list-numbered',
    tone: 'text-info'
  },
  {
    label: '筛选',
    value: activeFilterCount.value ? `${activeFilterCount.value} 项` : '未启用',
    icon: 'i-mdi-filter-variant',
    tone: activeFilterCount.value ? 'text-warning' : 'text-muted'
  }
])

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
  void fetchList()
})

function reloadFromFirstPage() {
  if (page.value === 1) {
    void fetchList()
    return
  }

  page.value = 1
}

function apply() {
  reloadFromFirstPage()
}

function reset() {
  filters.userId = ''
  filters.reason = 'all'
  reloadFromFirstPage()
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
  <div class="log-page-shell flex flex-1 flex-col gap-4 sm:gap-5">
    <section class="log-page-hero relative overflow-hidden rounded-2xl border border-default p-5 sm:p-6">
      <div class="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="space-y-3">
          <UBadge
            color="neutral"
            variant="solid"
            size="sm"
            class="bg-elevated/80 text-default backdrop-blur"
          >
            Credit ledger
          </UBadge>
          <div>
            <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
              全站积分流水
            </h2>
            <p class="mt-1 text-sm text-toned">
              用户积分变动、扣费退款与后台调整记录
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <div
            v-for="metric in logMetricItems"
            :key="metric.label"
            class="rounded-xl border border-default bg-elevated/80 p-3 shadow-sm backdrop-blur"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted">{{ metric.label }}</span>
              <UIcon
                :name="metric.icon"
                class="size-4"
                :class="metric.tone"
              />
            </div>
            <div class="mt-2 text-lg font-semibold tabular-nums text-highlighted">
              {{ metric.value }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <UCard
      class="log-filter-card"
      variant="subtle"
      :ui="{ body: 'p-4 sm:p-5' }"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-filter-variant"
              class="size-4 text-muted"
            />
            <h3 class="text-sm font-semibold text-highlighted">
              筛选条件
            </h3>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ activeFilterCount ? `${activeFilterCount} 项筛选` : '未筛选' }}
          </UBadge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
          <UFormField label="用户 ID">
            <UInput
              v-model.number="filters.userId"
              type="number"
              placeholder="留空查全部"
              class="w-full"
            />
          </UFormField>
          <UFormField label="原因">
            <USelect
              v-model="filters.reason"
              :items="reasonItems"
              class="w-full"
            />
          </UFormField>
          <div class="flex gap-2 md:col-span-2 xl:col-span-1">
            <UButton
              icon="i-mdi-magnify"
              @click="apply"
            >
              查询
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-mdi-restore"
              @click="reset"
            >
              重置
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <UTable
      class="shrink-0"
      :data="items"
      :columns="columns"
      :loading="loading"
      empty="暂无积分流水"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
        separator: 'h-0'
      }"
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
    </UTable>

    <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
      <div class="text-sm text-muted">
        共 {{ total.toLocaleString() }} 条
      </div>
      <div class="flex items-center gap-1.5">
        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-page-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 12%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-success) 10%, transparent) 0%, transparent 58%),
    var(--ui-bg);
}
</style>
