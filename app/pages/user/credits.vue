<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useUserCreditsPage, reasonLabel, reasonColor, type TransactionRow } from '~/composables/user/useUserCreditsPage'

useHead({ title: '积分' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

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
  checkin,
  checkinLoading,
  isCheckingIn,
  redeem,
  performCheckin,
  applyFilters,
  resetFilters,
  refreshAll,
  init
} = useUserCreditsPage()

onMounted(() => {
  void init()
})

const reasonItems = [
  { label: '全部类型', value: 'all' },
  { label: 'API 扣费', value: 'api_charge' },
  { label: 'API 退款', value: 'api_refund' },
  { label: '兑换码', value: 'redemption_code' },
  { label: '每日签到', value: 'checkin' },
  { label: '管理员加积分', value: 'admin_grant' },
  { label: '管理员扣积分', value: 'admin_revoke' },
  { label: '管理员重置', value: 'admin_reset' },
  { label: '注册赠送', value: 'signup_bonus' }
]

const directionItems = [
  { label: '全部方向', value: 'all' },
  { label: '收入（+）', value: 'in' },
  { label: '支出（−）', value: 'out' }
]

function formatDate(iso: string) {
  return formatDateTime(iso)
}

const columns: TableColumn<TransactionRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'reason', header: '类型' },
  { accessorKey: 'amount', header: '变动' },
  { accessorKey: 'balanceAfter', header: '操作后积分' },
  { id: 'detail', header: '关联' },
  { accessorKey: 'remark', header: '备注' }
]

function amountClass(amt: number) {
  if (amt > 0) return 'text-success font-semibold tabular-nums'
  if (amt < 0) return 'text-error font-semibold tabular-nums'
  return 'text-muted tabular-nums'
}
</script>

<template>
  <UDashboardPanel id="user-credits">
    <template #header>
      <UDashboardNavbar title="积分">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions
            :on-refresh="refreshAll"
            :refreshing="loading || summaryLoading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UserCreditsOverviewCards :summary="summary" />

        <UserCreditsCheckinCard
          :status="checkin"
          :loading="checkinLoading"
          :submitting="isCheckingIn"
          :on-checkin="performCheckin"
        />

        <UserCreditsRedeemCard
          :records="redeemRecords"
          :on-redeem="redeem"
        />

        <UserCreditsByReasonCard :by-reason="summary.byReason" />

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
              <h3 class="text-lg font-semibold text-highlighted">
                积分流水
              </h3>
              <span class="ml-auto text-xs text-muted tabular-nums">
                共 {{ total.toLocaleString() }} 条
              </span>
            </div>
          </template>
          <DashboardDataTable
            v-model:page="page"
            :data="items"
            :columns="columns"
            :loading="loading"
            :page-size="pageSize"
            :total="total"
            :fixed="false"
            empty-title="暂无流水记录"
            empty-icon="i-mdi-format-list-bulleted"
          >
            <template #createdAt-cell="{ row }">
              <span class="text-xs text-muted whitespace-nowrap tabular-nums">{{ formatDate(row.original.createdAt) }}</span>
            </template>
            <template #reason-cell="{ row }">
              <UBadge
                :color="reasonColor(row.original.reason)"
                variant="subtle"
                size="sm"
              >
                {{ reasonLabel(row.original.reason) }}
              </UBadge>
            </template>
            <template #amount-cell="{ row }">
              <span :class="amountClass(Number(row.original.amount) || 0)">
                {{ (Number(row.original.amount) || 0) > 0 ? '+' : '' }}{{ (Number(row.original.amount) || 0).toLocaleString() }}
              </span>
            </template>
            <template #balanceAfter-cell="{ row }">
              <span class="tabular-nums">{{ Number(row.original.balanceAfter).toLocaleString() }}</span>
            </template>
            <template #detail-cell="{ row }">
              <div
                v-if="row.original.apiId && row.original.apiName"
                class="flex flex-col text-xs"
              >
                <span class="font-medium">{{ row.original.apiName }}</span>
                <span class="font-mono text-muted">{{ row.original.apiPath || '' }}</span>
                <span
                  v-if="row.original.apiCallId"
                  class="text-muted text-[10px]"
                >调用 #{{ row.original.apiCallId }}</span>
              </div>
              <div
                v-else-if="row.original.reason === 'redemption_code' && (row.original.code || row.original.codeId)"
                class="flex flex-col text-xs"
              >
                <span class="text-muted">兑换码</span>
                <span class="font-mono">{{ row.original.code || `#${row.original.codeId}` }}</span>
              </div>
              <div
                v-else-if="row.original.operatorName"
                class="flex flex-col text-xs"
              >
                <span class="text-muted">操作人</span>
                <span>{{ row.original.operatorName }}</span>
              </div>
              <span
                v-else
                class="text-muted text-xs"
              >-</span>
            </template>
            <template #remark-cell="{ row }">
              <span class="text-xs text-muted truncate max-w-[280px] block">{{ row.original.remark || '-' }}</span>
            </template>
          </DashboardDataTable>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
