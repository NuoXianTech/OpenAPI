<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useUserWalletPage, reasonLabel, reasonColor, type TransactionRow } from '~/composables/user/useUserWalletPage'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const UBadge = resolveComponent('UBadge')

const {
  summary,
  summaryLoading,
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  redeemRecords,
  totalPages,
  redeem,
  applyFilters,
  resetFilters,
  refreshAll,
  init,
} = useUserWalletPage()

onMounted(() => {
  void init()
})

const reasonItems = [
  { label: '全部类型', value: 'all' },
  { label: 'API 扣费', value: 'api_charge' },
  { label: 'API 退款', value: 'api_refund' },
  { label: '兑换码', value: 'redemption_code' },
  { label: '管理员加积分', value: 'admin_grant' },
  { label: '管理员扣积分', value: 'admin_revoke' },
  { label: '管理员重置', value: 'admin_reset' },
  { label: '注册赠送', value: 'signup_bonus' },
]

const directionItems = [
  { label: '全部方向', value: 'all' },
  { label: '收入（+）', value: 'in' },
  { label: '支出（−）', value: 'out' },
]

function formatDate(iso: string) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  }
  catch {
    return iso
  }
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
    header: '操作后积分',
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
        <UserWalletOverviewCards :summary="summary" />

        <UserWalletRedeemCard
          :records="redeemRecords"
          :on-redeem="redeem"
        />

        <UserWalletByReasonCard :by-reason="summary.byReason" />

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

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                积分流水
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
