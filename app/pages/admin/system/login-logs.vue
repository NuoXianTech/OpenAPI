<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'
import {
  LOGIN_METHOD_META,
  loginFailureReasonLabel,
  loginMethodLabel,
  type AdminLoginLogRow,
  type LoginMethod
} from '~~/shared/types/login-log'

useHead({ title: '登录日志' })
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

// 用 type 别名而非 interface：useAdminPagedList 的 TFilters 受 Record<string, unknown> 约束。
type LoginLogFilters = {
  startAt: string
  endAt: string
  method: '' | LoginMethod
  success: 'all' | 'success' | 'failure'
  userId: number | ''
}

const localPageSize = 50
const {
  filters,
  page,
  pageSize,
  items,
  total,
  status,
  applyFilters,
  reset
} = useAdminPagedList<LoginLogFilters, AdminLoginLogRow>({
  path: '/api/admin/login-logs/list',
  defaultFilters: {
    startAt: '',
    endAt: '',
    method: '',
    success: 'all',
    userId: ''
  },
  defaultPageSize: localPageSize,
  buildQuery: (f, p) => ({
    startAt: f.startAt ? new Date(f.startAt).toISOString() : undefined,
    endAt: f.endAt ? new Date(f.endAt).toISOString() : undefined,
    method: f.method || undefined,
    success: f.success === 'all' ? undefined : f.success,
    userId: f.userId || undefined,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

const activeFilterCount = computed(() => [
  !!filters.startAt,
  !!filters.endAt,
  filters.method !== '',
  filters.success !== 'all',
  filters.userId !== ''
].filter(Boolean).length)

const logMetricItems = computed(() => [
  {
    label: '总记录',
    value: total.value.toLocaleString(),
    icon: 'i-mdi-login-variant',
    tone: 'text-primary'
  },
  {
    label: '本页',
    value: items.value.length.toLocaleString(),
    icon: 'i-mdi-format-list-numbered',
    tone: 'text-info'
  },
  {
    label: '筛选',
    value: activeFilterCount.value ? `${activeFilterCount.value} 项` : '未启用',
    icon: 'i-mdi-filter-variant',
    tone: activeFilterCount.value ? 'text-warning' : 'text-muted'
  }
])

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const methodItems = [
  { label: '全部方式', value: '' },
  { label: LOGIN_METHOD_META.password.label, value: 'password' },
  { label: LOGIN_METHOD_META.oauth_github.label, value: 'oauth_github' },
  { label: LOGIN_METHOD_META.oauth_qq.label, value: 'oauth_qq' }
]
const successItems = [
  { label: '全部结果', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' }
]

function methodColor(method: string) {
  return LOGIN_METHOD_META[method as LoginMethod]?.color || 'neutral'
}
function methodIcon(method: string) {
  return LOGIN_METHOD_META[method as LoginMethod]?.icon
}

const columns: TableColumn<AdminLoginLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { id: 'user', header: '用户' },
  { accessorKey: 'method', header: '方式' },
  { accessorKey: 'success', header: '结果' },
  { accessorKey: 'device', header: '设备' },
  { accessorKey: 'ip', header: 'IP' }
]
</script>

<template>
  <div class="log-page-shell space-y-4 sm:space-y-5">
    <section class="log-page-hero relative overflow-hidden rounded-2xl border border-default p-5 sm:p-6">
      <div class="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="space-y-3">
          <UBadge
            color="neutral"
            variant="solid"
            size="sm"
            class="bg-elevated/80 text-default backdrop-blur"
          >
            Login logs
          </UBadge>
          <div>
            <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
              登录日志
            </h2>
            <p class="mt-1 text-sm text-toned">
              已识别用户的登录尝试（成功 + 失败）、登录方式与客户端来源
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <div
            v-for="metric in logMetricItems"
            :key="metric.label"
            class="rounded-xl border border-default bg-elevated/80 p-3 shadow-sm backdrop-blur"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted">{{ metric.label }}</span>
              <UIcon
                :name="metric.icon"
                class="size-4"
                :class="metric.tone"
              />
            </div>
            <div class="mt-2 text-lg font-semibold tabular-nums text-highlighted">
              {{ metric.value }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <UCard
      class="log-filter-card"
      variant="subtle"
      :ui="{ body: 'p-4 sm:p-5' }"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-filter-variant"
              class="size-4 text-muted"
            />
            <h3 class="text-sm font-semibold text-highlighted">
              筛选条件
            </h3>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ activeFilterCount ? `${activeFilterCount} 项筛选` : '未筛选' }}
          </UBadge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <UFormField label="开始时间">
            <UInput
              v-model="filters.startAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField label="结束时间">
            <UInput
              v-model="filters.endAt"
              type="datetime-local"
              class="w-full"
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

        <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-mdi-restore"
            @click="reset"
          >
            重置
          </UButton>
          <UButton
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard
      class="log-table-card overflow-hidden"
      variant="subtle"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-login-variant"
              class="size-5 text-muted"
            />
            <h3 class="font-semibold text-highlighted">
              登录明细
            </h3>
          </div>
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
        empty-title="暂无登录日志"
        empty-icon="i-mdi-login-variant"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #user-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span class="font-medium">{{ row.original.username || '已删除用户' }}</span>
            <span class="text-muted">#{{ row.original.userId }}</span>
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
    </UCard>
  </div>
</template>

<style scoped>
.log-page-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 12%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-info) 10%, transparent) 0%, transparent 58%),
    var(--ui-bg);
}
</style>
