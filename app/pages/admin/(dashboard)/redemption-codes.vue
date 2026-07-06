<script setup lang="ts">
import {
  useAdminRedemptionCodesDisplayMeta,
  useRedemptionCodesPage
} from '~/composables/admin/use-redemption-codes-page'

useHead({ title: '兑换码' })
const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  batches,
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

function openGenerateModal() {
  generateOpen.value = true
}

const {
  statusItems,
  batchItems,
  columns,
  statusOf,
  getRowItems,
  onBatchFilter
} = useAdminRedemptionCodesDisplayMeta({
  batches,
  filters,
  applyFilters,
  toggle,
  remove,
  copyOne
})
</script>

<template>
  <UDashboardPanel id="admin-redemption-codes">
    <template #header>
      <UDashboardNavbar
        title="兑换码"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
              icon="i-mdi-plus"
              color="primary"
              @click="openGenerateModal"
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

        <DashboardTableCard
          title="兑换码明细"
          icon="i-mdi-ticket-percent-outline"
          :total="total"
        >
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
                {{ row.original.expiresAt ? formatDateTime(row.original.expiresAt) : '永不过期' }}
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
              <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="text-right">
                <UDropdownMenu
                  :items="getRowItems(row.original)"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    icon="i-mdi-dots-vertical"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                  />
                </UDropdownMenu>
              </div>
            </template>
          </DashboardDataTable>
        </DashboardTableCard>

        <AdminRedemptionCodeGenerateModal
          v-model:open="generateOpen"
          :on-generate="generate"
          :on-copy-one="copyOne"
          :on-copy-all="copyAll"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
