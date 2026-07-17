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

const { t, locale } = useI18n()
useHead({ title: () => t('admin.credits.users.pageTitle') })

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

const balanceItems = computed(() => [
  { label: t('admin.credits.users.filters.allBalances'), value: 'all' },
  { label: t('admin.credits.users.filters.positive'), value: 'positive' },
  { label: t('admin.credits.users.filters.zero'), value: 'zero' },
  { label: t('admin.credits.users.filters.negative'), value: 'negative' }
])

const columns = computed<TableColumn<AdminCreditUser>[]>(() => [
  { id: 'select', header: '' },
  { accessorKey: 'id', header: t('admin.credits.users.columns.user') },
  { accessorKey: 'credits', header: t('admin.credits.users.columns.balance') },
  { id: 'status', header: t('admin.credits.users.columns.status') },
  { accessorKey: 'createdAt', header: t('admin.credits.users.columns.createdAt') },
  { id: 'actions', header: '' }
])

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
  openCreditModal(selectedIds.value, t('admin.credits.users.selectedUsers', { count: selectedIds.value.length }))
}

function formatCreditUserIdentity(user: AdminCreditUser): string {
  return user.role === 'admin'
    ? t('common.identities.adminWithId', { id: user.id })
    : t('common.identities.userWithId', { id: user.id })
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
          {{ $t('admin.credits.users.title') }}
        </h2>
        <p class="mt-1 text-sm text-toned">
          {{ $t('admin.credits.users.description') }}
        </p>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filters.keyword"
        icon="i-mdi-magnify"
        :placeholder="$t('admin.credits.users.searchPlaceholder')"
        class="w-full sm:w-80"
      />
      <AdminFilterPopover
        :active-count="activeFilterCount"
        :title="$t('admin.credits.users.filterTitle')"
        @apply="applyFilters"
        @reset="resetFilters"
      >
        <div class="grid gap-3">
          <UFormField :label="$t('admin.credits.users.filters.userId')">
            <UInput
              v-model.number="filters.userId"
              type="number"
              min="1"
              :placeholder="$t('admin.credits.users.filters.emptyAll')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.users.filters.balance')">
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
          {{ $t('admin.credits.users.selectedCount', { count: selectedIds.length }) }}
        </span>
        <UButton
          icon="i-mdi-cash-edit"
          :disabled="selectedIds.length === 0"
          @click="openCreditForSelection"
        >
          {{ $t('admin.credits.users.actions.batchAdjust') }}
        </UButton>
        <UButton
          icon="i-mdi-refresh"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="refresh"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
      </div>
    </div>

    <DashboardTableCard
      :title="$t('admin.credits.users.listTitle')"
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
        :empty-title="$t('admin.credits.users.empty')"
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
            {{ row.original.credits.toLocaleString(locale) }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              :color="row.original.isActive ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ row.original.isActive ? $t('common.accounts.active') : $t('common.accounts.inactive') }}
            </UBadge>
            <UBadge
              v-if="row.original.isBanned"
              color="error"
              variant="subtle"
            >
              {{ $t('common.accounts.banned') }}
            </UBadge>
          </div>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-xs text-muted">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
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
              {{ $t('admin.credits.users.actions.adjust') }}
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
