<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import {
  useAdminRedemptionCodesDisplayMeta,
  useRedemptionCodesPage
} from '~/composables/admin/use-redemption-codes-page'

const { t, locale } = useI18n()
useHead({ title: () => t('admin.credits.redemptionCodes.title') })
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
  generate,
  toggle,
  remove,
  toggleBatch,
  deleteBatch,
  copyOne,
  copyAll
} = useRedemptionCodesPage()

const generateOpen = ref(false)
const activeFilterCount = computed(() => [
  filters.status !== 'all',
  filters.batchId !== 'all'
].filter(Boolean).length)

onMounted(() => {
  void init()
})

function openGenerateModal() {
  generateOpen.value = true
}

async function resetRedemptionFilters() {
  filters.status = 'all'
  filters.batchId = 'all'
  await applyFilters()
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
  <div class="space-y-6">
    <DashboardPageIntro
      :title="$t('admin.credits.redemptionCodes.title')"
      :description="$t('admin.credits.redemptionCodes.description')"
    />

    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <div class="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
        <UInput
          v-model="filters.keyword"
          class="w-full sm:w-80"
          icon="i-mdi-magnify"
          :placeholder="$t('admin.credits.redemptionCodes.searchPlaceholder')"
          @keydown.enter="applyFilters"
        />
        <AdminFilterPopover
          :active-count="activeFilterCount"
          @apply="applyFilters"
          @reset="resetRedemptionFilters"
        >
          <UFormField :label="$t('admin.credits.redemptionCodes.filters.status')">
            <USelect
              v-model="filters.status"
              :items="statusItems"
              :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.redemptionCodes.filters.batch')">
            <USelect
              v-model="filters.batchId"
              :items="batchItems"
              :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
              class="w-full"
            />
          </UFormField>
        </AdminFilterPopover>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <UButton
          icon="i-mdi-plus"
          color="primary"
          @click="openGenerateModal"
        >
          {{ $t('admin.credits.redemptionCodes.actions.generate') }}
        </UButton>
        <UButton
          icon="i-mdi-refresh"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="init"
        >
          {{ $t('common.actions.refresh') }}
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
      :title="$t('admin.credits.redemptionCodes.detailsTitle')"
      icon="i-mdi-ticket-percent-outline"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :empty-title="$t('admin.credits.redemptionCodes.empty')"
        empty-icon="i-mdi-ticket-percent-outline"
      >
        <template #code-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <UTooltip
              :text="$t('admin.credits.redemptionCodes.actions.clickToCopy')"
              :content="{ side: 'top' }"
            >
              <span
                class="font-mono text-sm cursor-pointer hover:text-primary"
                @click="copyOne(row.original.code)"
              >
                {{ row.original.code }}
              </span>
            </UTooltip>
            <span
              v-if="row.original.batchId"
              class="text-[11px] text-muted font-mono"
            >
              {{ row.original.batchId }}
            </span>
          </div>
        </template>
        <template #amount-cell="{ row }">
          <span class="tabular-nums font-semibold text-success">+{{ row.original.amount.toLocaleString(locale) }}</span>
        </template>
        <template #usage-cell="{ row }">
          <span class="tabular-nums text-sm">{{ row.original.usedCount }} / {{ row.original.maxUses }}</span>
        </template>
        <template #note-cell="{ row }">
          <span class="text-xs text-muted truncate max-w-[200px] block">{{ row.original.note || '-' }}</span>
        </template>
        <template #expiresAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">
            {{ row.original.expiresAt
              ? formatDateTime(row.original.expiresAt, '-', locale)
              : $t('admin.credits.redemptionCodes.neverExpires') }}
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
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
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

    <LazyAdminRedemptionCodeGenerateModal
      v-if="generateOpen"
      v-model:open="generateOpen"
      :on-generate="generate"
      :on-copy-one="copyOne"
      :on-copy-all="copyAll"
    />
  </div>
</template>
