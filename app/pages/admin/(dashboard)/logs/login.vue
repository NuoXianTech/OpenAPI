<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useAdminLoginLogList } from '~/composables/admin/use-admin-call-logs-page'
import { useLoginLogMeta } from '~/composables/logs/use-login-log-meta'

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
  reset,
  activeFilterCount,
  methodItems,
  successItems,
  methodColor,
  methodIcon,
  columns
} = useAdminLoginLogList()
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-hero-surface relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            {{ $t('admin.logs.login.title') }}
          </h2>
          <p class="mt-1 text-sm text-toned">
            {{ $t('admin.logs.login.description') }}
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        :title="$t('admin.logs.login.filterTitle')"
        panel-class="w-[min(calc(100vw-2rem),38rem)] p-3"
        @apply="applyFilters"
        @reset="reset"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField
            :label="$t('admin.logs.login.filters.timeRange')"
            class="md:col-span-2"
          >
            <CommonDateRangePicker
              v-model:start="filters.startAt"
              v-model:end="filters.endAt"
              :placeholder="$t('admin.logs.login.filters.allTime')"
            />
          </UFormField>
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
      <UButton
        class="ml-auto"
        icon="i-mdi-refresh"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
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
          <span
            class="text-xs"
            :title="row.original.userAgent || ''"
          >{{ row.original.device }}</span>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
  </div>
</template>
