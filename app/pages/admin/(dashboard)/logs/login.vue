<script setup lang="ts">
import { PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { useAdminLoginLogList } from '~/composables/admin/use-admin-call-logs-page'
import {
  loginFailureReasonLabel,
  loginMethodLabel
} from '#shared/types/login-log'

useHead({ title: '登录日志' })
const {
  filters,
  page,
  pageSize,
  items,
  total,
  loading,
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
    <section class="dashboard-hero-surface dashboard-hero-surface-info relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
      <div class="relative z-10 space-y-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
            登录日志
          </h2>
          <p class="mt-1 text-sm text-toned">
            已识别用户的登录尝试（成功 + 失败）、登录方式与客户端来源
          </p>
        </div>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <AdminFilterPopover
        :active-count="activeFilterCount"
        title="登录日志筛选"
        panel-class="w-[min(calc(100vw-2rem),38rem)] p-3"
        @apply="applyFilters"
        @reset="reset"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <UFormField
            label="时间范围"
            class="md:col-span-2"
          >
            <CommonDateRangePicker
              v-model:start="filters.startAt"
              v-model:end="filters.endAt"
              placeholder="全部时间"
            />
          </UFormField>
          <UFormField label="登录方式">
            <USelect
              v-model="filters.method"
              :items="methodItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="结果">
            <USelect
              v-model="filters.success"
              :items="successItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="用户 ID"
            hint="留空查全部"
          >
            <UInput
              v-model.number="filters.userId"
              type="number"
              placeholder="留空查全部"
              class="w-full"
            />
          </UFormField>
        </div>
      </AdminFilterPopover>
    </div>

    <DashboardTableCard
      title="登录明细"
      icon="i-mdi-login-variant"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="items"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        empty-title="暂无登录日志"
        empty-icon="i-mdi-login-variant"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #user-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.username }}</span>
            <span class="text-muted">{{ formatUserIdentity(row.original.userId) }}</span>
          </div>
        </template>
        <template #method-cell="{ row }">
          <UBadge
            :color="methodColor(row.original.method)"
            :icon="methodIcon(row.original.method)"
            variant="subtle"
            size="sm"
          >
            {{ loginMethodLabel(row.original.method) }}
          </UBadge>
        </template>
        <template #success-cell="{ row }">
          <UBadge
            :color="row.original.success ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.success ? '成功' : loginFailureReasonLabel(row.original.failureReason) }}
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
