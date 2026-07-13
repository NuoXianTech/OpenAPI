<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import type { AdminCreditUser } from '#shared/types/admin-credits'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

interface CreditUserFilters extends Record<string, unknown> {
  keyword: string
  userId: number | ''
  balance: 'all' | 'positive' | 'zero' | 'negative'
}

useHead({ title: '用户积分' })

const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  refresh,
  applyFilters: applyPagedFilters,
  reset
} = usePrivatePagedList<CreditUserFilters, AdminCreditUser>({
  path: '/api/admin/credits/users',
  defaultFilters: { keyword: '', userId: '', balance: 'all' },
  defaultPageSize: DEFAULT_PAGE_SIZE,
  buildQuery: (currentFilters, pagination) => ({
    keyword: currentFilters.keyword.trim() || undefined,
    userId: currentFilters.userId || undefined,
    balance: currentFilters.balance === 'all' ? undefined : currentFilters.balance,
    limit: pagination.limit,
    offset: pagination.offset
  })
})

const balanceItems = [
  { label: '全部余额', value: 'all' },
  { label: '有积分', value: 'positive' },
  { label: '零积分', value: 'zero' },
  { label: '负积分（异常）', value: 'negative' }
]

const columns: TableColumn<AdminCreditUser>[] = [
  { id: 'select', header: '' },
  { accessorKey: 'id', header: '用户' },
  { accessorKey: 'credits', header: '积分余额' },
  { id: 'status', header: '账号状态' },
  { accessorKey: 'createdAt', header: '注册时间' },
  { id: 'actions', header: '' }
]

const rowSelection = ref<Record<string, boolean>>({})
const creditOpen = ref(false)
const creditUserIds = ref<number[]>([])
const creditSelectionLabel = ref('')
const selectedIds = computed(() => Object.entries(rowSelection.value)
  .filter(([, isSelected]) => isSelected)
  .map(([id]) => Number(id)))
const activeFilterCount = computed(() => [
  filters.userId !== '',
  filters.balance !== 'all'
].filter(Boolean).length)

watch([page, pageSize], () => {
  rowSelection.value = {}
})

watchDebounced(
  () => filters.keyword,
  () => { void applyFilters() },
  { debounce: 300, maxWait: 1000 }
)

function openCreditModal(userIds: number[], label: string) {
  creditUserIds.value = userIds
  creditSelectionLabel.value = label
  creditOpen.value = true
}

function openCreditForUser(user: AdminCreditUser) {
  openCreditModal([user.id], user.displayName || user.username)
}

function openCreditForSelection() {
  if (selectedIds.value.length === 0) return
  openCreditModal(selectedIds.value, `已选择 ${selectedIds.value.length} 位用户`)
}

function formatCreditUserIdentity(user: AdminCreditUser): string {
  return user.role === 'admin'
    ? formatAdminIdentity(user.id)
    : formatUserIdentity(user.id)
}

async function applyFilters() {
  rowSelection.value = {}
  await applyPagedFilters()
}

async function resetFilters() {
  rowSelection.value = {}
  await reset()
}

async function onCreditSaved() {
  rowSelection.value = {}
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface dashboard-hero-surface-success relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10">
        <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          用户积分
        </h2>
        <p class="mt-1 text-sm text-toned">
          查询用户余额，对单个或选中的用户发放、扣除和重置积分
        </p>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filters.keyword"
        icon="i-mdi-magnify"
        placeholder="搜索用户名、昵称或邮箱..."
        class="w-full sm:w-80"
      />
      <AdminFilterPopover
        :active-count="activeFilterCount"
        title="用户积分筛选"
        @apply="applyFilters"
        @reset="resetFilters"
      >
        <div class="grid gap-3">
          <UFormField label="用户 ID">
            <UInput
              v-model.number="filters.userId"
              type="number"
              min="1"
              placeholder="留空查询全部"
              class="w-full"
            />
          </UFormField>
          <UFormField label="积分余额">
            <USelect
              v-model="filters.balance"
              :items="balanceItems"
              class="w-full"
            />
          </UFormField>
        </div>
      </AdminFilterPopover>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted">
          已选 {{ selectedIds.length }} 位
        </span>
        <UButton
          icon="i-mdi-cash-edit"
          :disabled="selectedIds.length === 0"
          @click="openCreditForSelection"
        >
          批量调整积分
        </UButton>
        <UButton
          icon="i-mdi-refresh"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="refresh"
        >
          刷新
        </UButton>
      </div>
    </div>

    <DashboardTableCard
      title="用户余额"
      icon="i-mdi-account-cash-outline"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        v-model:row-selection="rowSelection"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        :get-row-id="(row: AdminCreditUser) => String(row.id)"
        empty-title="暂无符合条件的用户"
        empty-icon="i-mdi-account-off-outline"
      >
        <template #select-header="{ table }">
          <UCheckbox
            :model-value="table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()"
            @update:model-value="(value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true)"
          />
        </template>
        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="row.getIsSelected()"
            @update:model-value="(value: boolean | 'indeterminate') => row.toggleSelected(value === true)"
          />
        </template>
        <template #id-cell="{ row }">
          <div class="flex flex-col">
            <span class="text-sm font-medium text-highlighted">{{ row.original.displayName || row.original.username }}</span>
            <span class="text-xs text-muted">{{ row.original.username }} · {{ formatCreditUserIdentity(row.original) }}</span>
            <span class="max-w-64 truncate text-xs text-muted">{{ row.original.email }}</span>
          </div>
        </template>
        <template #credits-cell="{ row }">
          <UBadge
            :color="row.original.credits > 0 ? 'success' : 'neutral'"
            variant="subtle"
            class="font-mono tabular-nums"
          >
            {{ row.original.credits.toLocaleString() }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              :color="row.original.isActive ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ row.original.isActive ? '已激活' : '未激活' }}
            </UBadge>
            <UBadge
              v-if="row.original.isBanned"
              color="error"
              variant="subtle"
            >
              已封禁
            </UBadge>
          </div>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-xs text-muted">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UButton
              icon="i-mdi-cash-edit"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openCreditForUser(row.original)"
            >
              调整
            </UButton>
          </div>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <LazyAdminCreditModal
      v-if="creditOpen"
      v-model:open="creditOpen"
      :user-ids="creditUserIds"
      :selection-label="creditSelectionLabel"
      @saved="onCreditSaved"
    />
  </div>
</template>
