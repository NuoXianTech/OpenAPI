<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const toast = useToast()

interface WalletSummary {
  balance: number
  totalIn: number
  totalOut: number
  totalCount: number
  byReason: Array<{ reason: string, count: number, sum: number }>
}

interface TransactionRow {
  id: number
  amount: number
  balanceAfter: number
  reason: string
  apiId: number | null
  apiName: string | null
  apiPath: string | null
  apiCallId: number | null
  operatorName: string | null
  remark: string | null
  createdAt: string
}

interface SummaryResp { code: number, msg: string, data: WalletSummary }
interface ListResp { code: number, msg: string, data: { items: TransactionRow[], total: number } }

const UBadge = resolveComponent('UBadge')

const summary = ref<WalletSummary>({ balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] })
const summaryLoading = ref(false)

const filters = reactive({
  reason: 'all' as 'all' | 'admin_grant' | 'admin_revoke' | 'admin_reset' | 'api_charge' | 'api_refund' | 'signup_bonus' | 'redemption_code',
  direction: 'all' as 'all' | 'in' | 'out',
})
const page = ref(1)
const pageSize = ref(50)
const items = ref<TransactionRow[]>([])
const total = ref(0)
const loading = ref(false)

const reasonItems = [
  { label: '全部类型', value: 'all' },
  { label: 'API 扣费', value: 'api_charge' },
  { label: 'API 退款', value: 'api_refund' },
  { label: '兑换码', value: 'redemption_code' },
  { label: '管理员加余额', value: 'admin_grant' },
  { label: '管理员扣余额', value: 'admin_revoke' },
  { label: '管理员重置', value: 'admin_reset' },
  { label: '注册赠送', value: 'signup_bonus' },
]

const directionItems = [
  { label: '全部方向', value: 'all' },
  { label: '收入（+）', value: 'in' },
  { label: '支出（−）', value: 'out' },
]

const reasonMeta: Record<string, { label: string, color: 'success' | 'error' | 'warning' | 'info' | 'neutral' }> = {
  api_charge: { label: 'API 扣费', color: 'error' },
  api_refund: { label: 'API 退款', color: 'success' },
  redemption_code: { label: '兑换码', color: 'success' },
  admin_grant: { label: '管理员加', color: 'success' },
  admin_revoke: { label: '管理员扣', color: 'error' },
  admin_reset: { label: '管理员重置', color: 'warning' },
  signup_bonus: { label: '注册赠送', color: 'info' },
}

async function fetchSummary() {
  summaryLoading.value = true
  try {
    const res = await $fetch<SummaryResp>('/api/user/credits/summary')
    summary.value = res?.data || { balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] }
  }
  catch (err) {
    console.error('failed to load wallet summary', err)
  }
  finally {
    summaryLoading.value = false
  }
}

async function fetchTransactions() {
  loading.value = true
  try {
    const res = await $fetch<ListResp>('/api/user/credits/transactions', {
      query: {
        reason: filters.reason === 'all' ? undefined : filters.reason,
        direction: filters.direction === 'all' ? undefined : filters.direction,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      },
    })
    items.value = res?.data?.items || []
    total.value = res?.data?.total || 0
  }
  catch (err) {
    console.error('failed to load transactions', err)
    items.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void fetchTransactions()
}

function resetFilters() {
  filters.reason = 'all'
  filters.direction = 'all'
  page.value = 1
  void fetchTransactions()
}

async function refreshAll() {
  await Promise.all([fetchSummary(), fetchTransactions()])
}

watch(page, () => { void fetchTransactions() })

onMounted(() => {
  void refreshAll()
})

// ----- 兑换码 -----
interface RedeemRecord {
  id: number
  codeId: number
  code: string | null
  amount: number
  redeemedAt: string
  note: string | null
}

const redeemCode = ref('')
const redeeming = ref(false)
const redeemRecords = ref<RedeemRecord[]>([])
const recentRedeemAmount = ref<number | null>(null)

async function fetchRedeemRecords() {
  try {
    const res = await $fetch<{ data: { items: RedeemRecord[], total: number } }>('/api/user/credits/redemptions', {
      query: { limit: 10 },
    })
    redeemRecords.value = res?.data?.items || []
  }
  catch (err) {
    console.error('failed to load redemption records', err)
  }
}

async function submitRedeem() {
  const code = redeemCode.value.trim().toUpperCase()
  if (!code) {
    toast.add({ title: '请输入兑换码', color: 'warning' })
    return
  }
  redeeming.value = true
  try {
    const res = await $fetch<{ data: { amount: number, balanceAfter: number } }>('/api/user/credits/redeem', {
      method: 'POST',
      body: { code },
    })
    recentRedeemAmount.value = res.data.amount
    toast.add({
      title: `兑换成功 +${res.data.amount.toLocaleString()}`,
      description: `当前余额 ${res.data.balanceAfter.toLocaleString()}`,
      color: 'success',
    })
    redeemCode.value = ''
    await refreshAll()
    await fetchRedeemRecords()
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || '兑换失败'
    toast.add({ title: msg, color: 'error' })
  }
  finally {
    redeeming.value = false
  }
}

onMounted(() => {
  void fetchRedeemRecords()
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const overviewCards = computed(() => [
  { key: 'balance', label: '当前余额', value: summary.value.balance.toLocaleString(), icon: 'i-mdi-wallet-outline', color: 'text-primary' },
  { key: 'in', label: '累计收入', value: summary.value.totalIn.toLocaleString(), icon: 'i-mdi-arrow-down-bold-circle-outline', color: 'text-success' },
  { key: 'out', label: '累计支出', value: summary.value.totalOut.toLocaleString(), icon: 'i-mdi-arrow-up-bold-circle-outline', color: 'text-error' },
  { key: 'count', label: '流水笔数', value: summary.value.totalCount.toLocaleString(), icon: 'i-mdi-format-list-numbered', color: 'text-info' },
])

function formatDate(iso: string) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) }
  catch { return iso }
}

function reasonLabel(reason: string) {
  return reasonMeta[reason]?.label || reason
}

function reasonColor(reason: string) {
  return reasonMeta[reason]?.color || 'neutral'
}

const columns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap tabular-nums' }, formatDate(row.original.createdAt)),
  },
  {
    accessorKey: 'reason',
    header: '类型',
    cell: ({ row }) => h(UBadge, {
      color: reasonColor(row.original.reason),
      variant: 'subtle',
      size: 'sm',
    }, () => reasonLabel(row.original.reason)),
  },
  {
    accessorKey: 'amount',
    header: '变动',
    cell: ({ row }) => {
      const amt = Number(row.original.amount) || 0
      const cls = amt > 0
        ? 'text-success font-semibold tabular-nums'
        : amt < 0
          ? 'text-error font-semibold tabular-nums'
          : 'text-muted tabular-nums'
      const sign = amt > 0 ? '+' : ''
      return h('span', { class: cls }, `${sign}${amt.toLocaleString()}`)
    },
  },
  {
    accessorKey: 'balanceAfter',
    header: '操作后余额',
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, Number(row.original.balanceAfter).toLocaleString()),
  },
  {
    id: 'detail',
    header: '关联',
    cell: ({ row }) => {
      if (row.original.apiId && row.original.apiName) {
        return h('div', { class: 'flex flex-col text-xs' }, [
          h('span', { class: 'font-medium' }, row.original.apiName),
          h('span', { class: 'font-mono text-muted' }, row.original.apiPath || ''),
          row.original.apiCallId
            ? h('span', { class: 'text-muted text-[10px]' }, `调用 #${row.original.apiCallId}`)
            : null,
        ].filter(Boolean))
      }
      if (row.original.operatorName) {
        return h('div', { class: 'flex flex-col text-xs' }, [
          h('span', { class: 'text-muted' }, '操作人'),
          h('span', null, row.original.operatorName),
        ])
      }
      return h('span', { class: 'text-muted text-xs' }, '-')
    },
  },
  {
    accessorKey: 'remark',
    header: '备注',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted truncate max-w-[280px] block' }, row.original.remark || '-'),
  },
]
</script>

<template>
  <UDashboardPanel id="user-wallet">
    <template #header>
      <UDashboardNavbar title="积分">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-mdi-refresh"
            :loading="loading || summaryLoading"
            @click="refreshAll"
          />
          <UserHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- 余额概览 -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard
            v-for="card in overviewCards"
            :key="card.key"
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
                  :class="card.color"
                  class="size-5"
                />
              </div>
            </div>
          </UCard>
        </div>

        <!-- 兑换码 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-ticket-percent-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                兑换码
              </h3>
            </div>
          </template>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField
              label="输入兑换码"
              class="flex-1 min-w-[260px]"
              hint="输入后点「兑换」即可加入余额，不区分大小写"
            >
              <UInput
                v-model="redeemCode"
                placeholder="例如 WELCOME-XXXXXXXXXXXXXXXX"
                class="font-mono uppercase"
                :ui="{ base: 'uppercase' }"
                @keydown.enter="submitRedeem"
              />
            </UFormField>
            <UButton
              icon="i-mdi-gift-outline"
              :loading="redeeming"
              @click="submitRedeem"
            >
              兑换
            </UButton>
          </div>
          <div
            v-if="redeemRecords.length > 0"
            class="mt-4 pt-3 border-t border-default"
          >
            <div class="text-xs text-muted mb-2">
              最近兑换
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="r in redeemRecords"
                :key="r.id"
                class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/30 px-3 py-1 text-xs"
              >
                <span class="font-mono text-muted">{{ r.code || `#${r.codeId}` }}</span>
                <span class="font-semibold text-success tabular-nums">
                  +{{ r.amount.toLocaleString() }}
                </span>
                <span class="text-muted">{{ formatDate(r.redeemedAt) }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- 按类型分布 -->
        <UCard v-if="summary.byReason.length > 0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-chart-pie-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                收支分布
              </h3>
            </div>
          </template>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="r in summary.byReason"
              :key="r.reason"
              class="flex items-center justify-between gap-2 rounded-lg border border-default p-3 bg-elevated/30"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UBadge
                  :color="reasonColor(r.reason)"
                  variant="subtle"
                  size="sm"
                >
                  {{ reasonLabel(r.reason) }}
                </UBadge>
                <span class="text-xs text-muted">
                  {{ r.count }} 笔
                </span>
              </div>
              <span
                class="font-semibold tabular-nums shrink-0"
                :class="r.sum > 0 ? 'text-success' : r.sum < 0 ? 'text-error' : 'text-muted'"
              >
                {{ r.sum > 0 ? '+' : '' }}{{ r.sum.toLocaleString() }}
              </span>
            </div>
          </div>
        </UCard>

        <!-- 筛选 -->
        <UCard>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField
              label="类型"
              class="min-w-[180px] flex-1"
            >
              <USelect
                v-model="filters.reason"
                :items="reasonItems"
              />
            </UFormField>
            <UFormField
              label="方向"
              class="min-w-[160px]"
            >
              <USelect
                v-model="filters.direction"
                :items="directionItems"
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
                @click="resetFilters"
              >
                重置
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- 流水表格 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                余额流水
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
            empty="暂无流水记录"
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
    </template>
  </UDashboardPanel>
</template>
