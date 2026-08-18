<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useAdminLoginLogList } from '~/composables/admin/use-admin-login-logs-page'
import { useLoginLogMeta } from '~/composables/use-login-log-meta'

const { t, locale } = useI18n()
const { getLoginFailureLabel, getLoginMethodLabel } = useLoginLogMeta()
useHead({ title: () => t('admin.logs.login.title') })
const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
  refresh,
  applyFilters,
  advancedFilterCount,
  methodItems,
  successItems,
  methodColor,
  methodIcon,
  columns,
  cleanupHasFilters,
  cleanupLoading,
  cleanupMatchCount,
  cleanupOpen,
  confirmCleanup,
  openCleanup
} = useAdminLoginLogList()

async function resetAdvancedFilters() {
  filters.method = 'all'
  filters.success = 'all'
  filters.userId = ''
  await applyFilters()
}
</script>

<template>
  <div class="space-y-6">
    <DashboardPageIntro
      :title="$t('admin.logs.login.title')"
      :description="$t('admin.logs.login.description')"
    />

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filters.keyword"
        type="search"
        icon="i-mdi-magnify"
        :placeholder="$t('admin.logs.login.searchPlaceholder')"
        :aria-label="$t('admin.logs.login.searchPlaceholder')"
        class="w-full sm:w-80"
        @keyup.enter="applyFilters"
      />
      <AdminFilterPopover
        :active-count="advancedFilterCount"
        :title="$t('admin.logs.login.filterTitle')"
        panel-class="w-[min(calc(100vw-2rem),34rem)] p-3"
        @apply="applyFilters"
        @reset="resetAdvancedFilters"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField :label="$t('admin.logs.login.filters.method')">
            <USelect
              v-model="filters.method"
              :items="methodItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.logs.login.filters.result')">
            <USelect
              v-model="filters.success"
              :items="successItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="$t('admin.logs.login.filters.userId')"
            :hint="$t('admin.logs.login.filters.emptyAll')"
          >
            <UInput
              v-model.number="filters.userId"
              type="number"
              :placeholder="$t('admin.logs.login.filters.emptyAll')"
              class="w-full"
            />
          </UFormField>
        </div>
      </AdminFilterPopover>
      <div class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
        <CommonDateRangePicker
          v-model:start="filters.startAt"
          v-model:end="filters.endAt"
          :placeholder="$t('admin.logs.login.filters.allTime')"
          class="w-full sm:w-64"
          @apply="applyFilters"
        />
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          :loading="loading && !cleanupOpen"
          :disabled="cleanupLoading"
          @click="openCleanup"
        >
          {{ $t('admin.logs.cleanup.button') }}
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
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
      :title="$t('admin.logs.login.detailsTitle')"
      icon="i-mdi-login-variant"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :empty-title="$t('admin.logs.login.empty')"
        empty-icon="i-mdi-login-variant"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
        </template>
        <template #user-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.username }}</span>
            <span class="text-muted">
              {{ row.original.role === 'admin'
                ? $t('common.identities.adminWithId', { id: row.original.userId })
                : $t('common.identities.userWithId', { id: row.original.userId }) }}
            </span>
          </div>
        </template>
        <template #method-cell="{ row }">
          <UBadge
            :color="methodColor(row.original.method)"
            :icon="methodIcon(row.original.method)"
            variant="subtle"
            size="sm"
          >
            {{ getLoginMethodLabel(row.original.method) }}
          </UBadge>
        </template>
        <template #success-cell="{ row }">
          <UBadge
            :color="row.original.success ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.success ? $t('common.states.success') : getLoginFailureLabel(row.original.failureReason) }}
          </UBadge>
        </template>
        <template #device-cell="{ row }">
          <UTooltip
            :text="row.original.userAgent || ''"
            :content="{ side: 'top' }"
            :disabled="!row.original.userAgent"
          >
            <span class="text-xs">{{ row.original.device }}</span>
          </UTooltip>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminLogCleanupModal
      v-model:open="cleanupOpen"
      :log-type-label="$t('admin.logs.login.title')"
      :match-count="cleanupMatchCount"
      :has-filters="cleanupHasFilters"
      :loading="cleanupLoading"
      :on-confirm="confirmCleanup"
    />
  </div>
</template>
