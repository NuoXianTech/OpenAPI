<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '~~/shared/types/admin-logs'

useHead({ title: '调用日志' })
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

// ─── 类型展示元数据 ──────────────────────────────────────────────
const typeMeta: Record<AdminLogType, { label: string, color: 'success' | 'error' | 'primary', icon: string }> = {
  consume: { label: '请求', color: 'primary', icon: 'i-mdi-swap-horizontal-circle-outline' },
  error: { label: '错误', color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

const typeSelectItems = ADMIN_LOG_TYPES.map(t => ({
  label: typeMeta[t].label,
  value: t,
  icon: typeMeta[t].icon
}))

// ─── 筛选选项 ───────────────────────────────────────────────────
const filterOptions = ref<AdminLogsFilterOptions>({ apis: [], categories: [] })

const apiSelectItems = computed(() => [
  { label: '全部接口', value: 0 },
  ...filterOptions.value.apis.map(a => ({ label: `${a.name}（${a.apiPath}）`, value: a.id }))
])

const categorySelectItems = computed(() => [
  { label: '全部分类', value: 0 },
  ...filterOptions.value.categories.map(c => ({ label: c.name, value: c.id }))
])

async function loadFilterOptions() {
  try {
    const res = await $fetch<AdminLogsFilterOptions>('/api/admin/logs/filters')
    filterOptions.value = res || { apis: [], categories: [] }
  } catch (err) {
    console.error('failed to load logs filters', err)
  }
}

// ─── 分页列表 ───────────────────────────────────────────────────
interface LogsFilters extends Record<string, unknown> {
  startAt: string
  endAt: string
  apiId: number
  categoryId: number
  types: AdminLogType[]
  apiKeyId: number | ''
  userId: number | ''
  requestId: string
}

const defaultFilters: LogsFilters = {
  startAt: '',
  endAt: '',
  apiId: 0,
  categoryId: 0,
  types: [],
  apiKeyId: '',
  userId: '',
  requestId: ''
}

const pageSize = 50
const {
  filters,
  page,
  items,
  total,
  status,
  applyFilters,
  reset
} = useAdminPagedList<LogsFilters, AdminLogRow>({
  path: '/api/admin/logs/list',
  defaultFilters,
  defaultPageSize: pageSize,
  buildQuery: (f, p) => ({
    startAt: f.startAt ? new Date(f.startAt).toISOString() : undefined,
    endAt: f.endAt ? new Date(f.endAt).toISOString() : undefined,
    apiId: f.apiId || undefined,
    categoryId: f.categoryId || undefined,
    types: f.types.length ? f.types.join(',') : undefined,
    apiKeyId: f.apiKeyId || undefined,
    userId: f.userId || undefined,
    requestId: f.requestId?.trim() || undefined,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

const expandedFilters = ref(false)
const hasAdvancedFilters = computed(
  () => filters.apiKeyId !== '' || filters.userId !== '' || !!filters.requestId
)
const activeFilterCount = computed(() => [
  !!filters.startAt,
  !!filters.endAt,
  filters.apiId !== 0,
  filters.categoryId !== 0,
  filters.types.length > 0,
  filters.apiKeyId !== '',
  filters.userId !== '',
  !!filters.requestId
].filter(Boolean).length)

const logMetricItems = computed(() => [
  {
    label: '总记录',
    value: total.value.toLocaleString(),
    icon: 'i-mdi-database-search-outline',
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

onMounted(() => {
  void loadFilterOptions()
})

// ─── 详情弹窗 ───────────────────────────────────────────────────
const detailRow = ref<AdminLogRow | null>(null)
const detailOpen = ref(false)

function openDetail(row: AdminLogRow) {
  detailRow.value = row
  detailOpen.value = true
}

// ─── 表格列 ─────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

function formatBytes(value: number | null) {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

const columns: TableColumn<AdminLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'userName', header: '用户' },
  { accessorKey: 'apiKeyName', header: '密钥' },
  { accessorKey: 'apiName', header: '接口' },
  { accessorKey: 'cost', header: '费用' },
  { id: 'summary', header: '摘要' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UDashboardPanel id="admin-logs">
    <template #header>
      <UDashboardNavbar title="调用日志">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="applyFilters"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
                Admin logs
              </UBadge>
              <div>
                <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
                  调用日志
                </h2>
                <p class="mt-1 text-sm text-toned">
                  公共接口调用流水、扣费结果与客户端上下文
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

        <!-- 筛选区 -->
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
              <UFormField
                label="开始时间"
              >
                <UInput
                  v-model="filters.startAt"
                  type="datetime-local"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="结束时间"
              >
                <UInput
                  v-model="filters.endAt"
                  type="datetime-local"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="接口名称"
                class="xl:col-span-1"
              >
                <USelectMenu
                  v-model="filters.apiId"
                  :items="apiSelectItems"
                  value-key="value"
                  searchable
                  placeholder="全部接口"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="分类"
              >
                <USelect
                  v-model="filters.categoryId"
                  :items="categorySelectItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="类型"
              >
                <USelectMenu
                  v-model="filters.types"
                  :items="typeSelectItems"
                  value-key="value"
                  multiple
                  placeholder="所有类型"
                  class="w-full"
                />
              </UFormField>
            </div>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if="expandedFilters"
                class="grid gap-3 border-t border-default pt-4 md:grid-cols-3"
              >
                <UFormField
                  label="密钥名称"
                  hint="按 API Key ID 筛选"
                >
                  <UInput
                    v-model.number="filters.apiKeyId"
                    type="number"
                    placeholder="留空查全部"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="用户"
                  hint="按用户 ID 筛选"
                >
                  <UInput
                    v-model.number="filters.userId"
                    type="number"
                    placeholder="留空查全部"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="请求 ID"
                >
                  <UInput
                    v-model="filters.requestId"
                    placeholder="UUID，精确匹配"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </Transition>

            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
              <UButton
                :color="expandedFilters || hasAdvancedFilters ? 'primary' : 'neutral'"
                variant="outline"
                :icon="expandedFilters ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
                @click="expandedFilters = !expandedFilters"
              >
                更多筛选
                <UBadge
                  v-if="hasAdvancedFilters"
                  color="primary"
                  variant="solid"
                  size="sm"
                  class="ml-1"
                >
                  ·
                </UBadge>
              </UButton>
              <div class="flex gap-2">
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
          </div>
        </UCard>

        <!-- 列表 -->
        <UCard
          class="log-table-card overflow-hidden"
          variant="subtle"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <template #header>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-mdi-text-box-search-outline"
                  class="size-5 text-muted"
                />
                <h3 class="font-semibold text-highlighted">
                  调用明细
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
            empty-title="暂无日志"
            empty-icon="i-mdi-text-box-search-outline"
          >
            <template #createdAt-cell="{ row }">
              <div class="flex flex-col gap-1 min-w-[150px]">
                <span class="text-xs whitespace-nowrap">
                  {{ formatDate(row.original.createdAt) }}
                </span>
                <UBadge
                  :color="typeMeta[row.original.type].color"
                  :icon="typeMeta[row.original.type].icon"
                  variant="subtle"
                  size="sm"
                  class="w-fit"
                >
                  {{ typeMeta[row.original.type].label }}
                </UBadge>
              </div>
            </template>

            <template #userName-cell="{ row }">
              <div
                v-if="row.original.userId"
                class="flex flex-col text-xs"
              >
                <span>{{ row.original.userName || '-' }}</span>
                <span class="text-muted">#{{ row.original.userId }}</span>
              </div>
              <span
                v-else
                class="text-xs text-muted italic"
              >匿名</span>
            </template>

            <template #apiKeyName-cell="{ row }">
              <span
                v-if="row.original.apiKeyName || row.original.apiKeyId"
                class="text-xs"
              >{{ row.original.apiKeyName || `#${row.original.apiKeyId}` }}</span>
              <span
                v-else
                class="text-xs text-muted italic"
              >-</span>
            </template>

            <template #apiName-cell="{ row }">
              <div
                v-if="row.original.apiName"
                class="flex flex-col"
              >
                <span class="text-sm font-medium">{{ row.original.apiName }}</span>
                <span class="font-mono text-xs text-muted">{{ row.original.apiPath }}</span>
              </div>
              <span
                v-else
                class="text-xs text-muted italic"
              >-</span>
            </template>

            <template #cost-cell="{ row }">
              <span
                class="tabular-nums text-sm"
                :class="row.original.cost > 0 ? 'text-warning font-medium' : 'text-muted'"
              >
                {{ row.original.cost > 0 ? `-${row.original.cost}` : '免费' }}
              </span>
            </template>

            <template #summary-cell="{ row }">
              <div class="flex flex-col text-xs gap-0.5">
                <div class="flex items-center gap-1.5">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    class="font-mono"
                  >
                    {{ row.original.method }}
                  </UBadge>
                  <span
                    class="tabular-nums"
                    :class="row.original.statusCode >= 400 ? 'text-error' : 'text-default'"
                  >
                    {{ row.original.statusCode }}
                  </span>
                  <span class="text-muted tabular-nums">
                    · {{ row.original.latencyMs }}ms
                  </span>
                  <UBadge
                    v-if="!row.original.isCounted"
                    color="warning"
                    variant="subtle"
                    size="sm"
                    title="未计入统计"
                  >
                    拒绝
                  </UBadge>
                </div>
                <span
                  v-if="row.original.errorMessage"
                  class="text-muted truncate max-w-[280px]"
                  :title="row.original.errorMessage"
                >
                  {{ row.original.errorCode ? `${row.original.errorCode}: ` : '' }}{{ row.original.errorMessage }}
                </span>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-mdi-eye-outline"
                aria-label="查看详情"
                @click="openDetail(row.original)"
              />
            </template>
          </DashboardDataTable>
        </UCard>
      </div>

      <UModal
        v-model:open="detailOpen"
        title="调用详情"
        :ui="{ content: 'max-w-2xl' }"
      >
        <template #body>
          <div
            v-if="detailRow"
            class="space-y-4 text-sm"
          >
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-muted">
                  时间
                </div>
                <div>{{ formatDate(detailRow.createdAt) }}</div>
              </div>
              <div>
                <div class="text-xs text-muted">
                  类型
                </div>
                <UBadge
                  :color="typeMeta[detailRow.type].color"
                  :icon="typeMeta[detailRow.type].icon"
                  variant="subtle"
                  size="sm"
                  class="w-fit"
                >
                  {{ typeMeta[detailRow.type].label }}
                </UBadge>
              </div>
              <div>
                <div class="text-xs text-muted">
                  请求 ID
                </div>
                <div class="font-mono text-xs break-all">
                  {{ detailRow.requestId || '-' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-muted">
                  用户
                </div>
                <div>
                  {{ detailRow.userId ? `${detailRow.userName || '-'} (#${detailRow.userId})` : '匿名' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-muted">
                  密钥
                </div>
                <div>
                  {{ detailRow.apiKeyName || (detailRow.apiKeyId ? `#${detailRow.apiKeyId}` : '-') }}
                </div>
              </div>
              <div>
                <div class="text-xs text-muted">
                  接口
                </div>
                <div>
                  {{ detailRow.apiName || '-' }}
                  <span
                    v-if="detailRow.categoryName"
                    class="text-muted text-xs"
                  >· {{ detailRow.categoryName }}</span>
                </div>
              </div>
            </div>

            <UCard
              :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
            >
              <template #header>
                <span class="text-xs font-semibold text-muted">请求</span>
              </template>
              <div class="space-y-2 text-xs">
                <div class="flex items-center gap-2">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    class="font-mono"
                  >
                    {{ detailRow.method }}
                  </UBadge>
                  <span class="font-mono break-all">{{ detailRow.apiPath }}</span>
                </div>
                <div
                  v-if="detailRow.queryString"
                  class="font-mono text-muted break-all"
                >
                  ?{{ detailRow.queryString }}
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  <span>状态码 <span
                    class="tabular-nums"
                    :class="detailRow.statusCode >= 400 ? 'text-error' : 'text-default'"
                  >{{ detailRow.statusCode }}</span></span>
                  <span>耗时 <span class="tabular-nums text-default">{{ detailRow.latencyMs }}ms</span></span>
                  <span>费用 <span class="tabular-nums text-default">{{ detailRow.cost > 0 ? `-${detailRow.cost}` : '免费' }}</span></span>
                  <span>请求体 <span class="text-default">{{ formatBytes(detailRow.requestSize) }}</span></span>
                  <span>响应体 <span class="text-default">{{ formatBytes(detailRow.responseSize) }}</span></span>
                </div>
              </div>
            </UCard>

            <UCard
              v-if="detailRow.errorCode || detailRow.errorMessage"
              :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
            >
              <template #header>
                <span class="text-xs font-semibold text-error">错误</span>
              </template>
              <div class="space-y-1 text-xs">
                <div v-if="detailRow.errorCode">
                  <span class="text-muted">code </span>
                  <span class="font-mono">{{ detailRow.errorCode }}</span>
                </div>
                <div
                  v-if="detailRow.errorMessage"
                  class="break-all"
                >
                  {{ detailRow.errorMessage }}
                </div>
              </div>
            </UCard>

            <UCard
              :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
            >
              <template #header>
                <span class="text-xs font-semibold text-muted">客户端</span>
              </template>
              <div class="space-y-1 text-xs">
                <div>
                  <span class="text-muted">IP </span>
                  <span class="font-mono">{{ detailRow.ip || '-' }}</span>
                </div>
                <div>
                  <span class="text-muted">User-Agent </span>
                  <span class="font-mono break-all">{{ detailRow.userAgent || '-' }}</span>
                </div>
                <div v-if="detailRow.referer">
                  <span class="text-muted">Referer </span>
                  <span class="font-mono break-all">{{ detailRow.referer }}</span>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.log-page-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 12%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-info) 10%, transparent) 0%, transparent 58%),
    var(--ui-bg);
}
</style>
