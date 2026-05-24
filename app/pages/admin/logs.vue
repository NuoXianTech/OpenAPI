<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '~~/shared/types/admin-logs'

useHead({ title: '通用日志' })
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

// ─── 类型展示元数据 ──────────────────────────────────────────────
const typeMeta: Record<AdminLogType, { label: string, color: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary', icon: string }> = {
  unknown: { label: '未知', color: 'neutral', icon: 'i-mdi-help-circle-outline' },
  recharge: { label: '充值', color: 'success', icon: 'i-mdi-cash-plus' },
  exchange: { label: '兑换', color: 'primary', icon: 'i-mdi-ticket-percent-outline' },
  consume: { label: '消耗', color: 'warning', icon: 'i-mdi-fire' },
  admin: { label: '管理', color: 'info', icon: 'i-mdi-shield-account-outline' },
  system: { label: '系统', color: 'neutral', icon: 'i-mdi-cog-outline' },
  error: { label: '错误', color: 'error', icon: 'i-mdi-alert-circle-outline' },
  refund: { label: '退款', color: 'info', icon: 'i-mdi-cash-refund' }
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

onMounted(() => {
  void loadFilterOptions()
})

// ─── 表格列 ─────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<AdminLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'userName', header: '用户' },
  { accessorKey: 'apiKeyName', header: '密钥' },
  { accessorKey: 'apiName', header: '接口' },
  { accessorKey: 'cost', header: '费用' },
  { id: 'detail', header: '详情' }
]
</script>

<template>
  <UDashboardPanel id="admin-logs">
    <template #header>
      <UDashboardNavbar title="通用日志">
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
      <div class="space-y-4">
        <!-- 筛选区 -->
        <UCard>
          <div class="space-y-3">
            <div class="flex flex-wrap items-end gap-3">
              <UFormField
                label="开始时间"
                class="min-w-[200px]"
              >
                <UInput
                  v-model="filters.startAt"
                  type="datetime-local"
                />
              </UFormField>
              <UFormField
                label="结束时间"
                class="min-w-[200px]"
              >
                <UInput
                  v-model="filters.endAt"
                  type="datetime-local"
                />
              </UFormField>
              <UFormField
                label="接口名称"
                class="min-w-[220px] flex-1"
              >
                <USelectMenu
                  v-model="filters.apiId"
                  :items="apiSelectItems"
                  value-key="value"
                  searchable
                  placeholder="全部接口"
                />
              </UFormField>
              <UFormField
                label="分类"
                class="min-w-[160px]"
              >
                <USelect
                  v-model="filters.categoryId"
                  :items="categorySelectItems"
                  value-key="value"
                />
              </UFormField>
              <UFormField
                label="类型"
                class="min-w-[220px] flex-1"
              >
                <USelectMenu
                  v-model="filters.types"
                  :items="typeSelectItems"
                  value-key="value"
                  multiple
                  placeholder="所有类型"
                />
              </UFormField>

              <UButton
                :color="expandedFilters ? 'primary' : 'neutral'"
                variant="outline"
                :icon="expandedFilters ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
                @click="expandedFilters = !expandedFilters"
              >
                展开
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
                class="flex flex-wrap items-end gap-3 border-t border-default pt-3"
              >
                <UFormField
                  label="密钥名称"
                  hint="按 API Key ID 筛选"
                  class="min-w-[180px]"
                >
                  <UInput
                    v-model.number="filters.apiKeyId"
                    type="number"
                    placeholder="留空查全部"
                  />
                </UFormField>
                <UFormField
                  label="用户"
                  hint="按用户 ID 筛选"
                  class="min-w-[180px]"
                >
                  <UInput
                    v-model.number="filters.userId"
                    type="number"
                    placeholder="留空查全部"
                  />
                </UFormField>
                <UFormField
                  label="请求 ID"
                  class="min-w-[260px] flex-1"
                >
                  <UInput
                    v-model="filters.requestId"
                    placeholder="UUID，精确匹配"
                  />
                </UFormField>
              </div>
            </Transition>

            <div class="flex justify-end gap-2 pt-1">
              <UButton
                color="neutral"
                variant="outline"
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

        <!-- 列表 -->
        <UCard :ui="{ body: 'p-0' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-text-box-search-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                通用日志
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
              >系统</span>
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
                v-if="row.original.source === 'api_call'"
                class="tabular-nums text-sm"
                :class="row.original.cost > 0 ? 'text-warning font-medium' : 'text-muted'"
              >
                {{ row.original.cost > 0 ? `-${row.original.cost}` : '免费' }}
              </span>
              <span
                v-else
                class="tabular-nums text-sm font-semibold"
                :class="row.original.cost > 0 ? 'text-success' : row.original.cost < 0 ? 'text-error' : 'text-muted'"
              >
                {{ row.original.cost > 0 ? `+${row.original.cost}` : row.original.cost }}
              </span>
            </template>

            <template #detail-cell="{ row }">
              <div
                v-if="row.original.source === 'api_call'"
                class="flex flex-col text-xs gap-0.5"
              >
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
                    :class="row.original.statusCode && row.original.statusCode >= 400 ? 'text-error' : 'text-default'"
                  >
                    {{ row.original.statusCode }}
                  </span>
                  <span
                    v-if="row.original.latencyMs !== null"
                    class="text-muted tabular-nums"
                  >· {{ row.original.latencyMs }}ms</span>
                </div>
                <span
                  v-if="row.original.errorMessage"
                  class="text-muted truncate max-w-[280px]"
                  :title="row.original.errorMessage"
                >
                  {{ row.original.errorCode ? `${row.original.errorCode}: ` : '' }}{{ row.original.errorMessage }}
                </span>
                <span
                  v-if="row.original.requestId"
                  class="font-mono text-muted text-[10px] truncate max-w-[280px]"
                  :title="row.original.requestId"
                >{{ row.original.requestId }}</span>
              </div>
              <div
                v-else
                class="flex flex-col text-xs gap-0.5"
              >
                <span
                  v-if="row.original.balanceAfter !== null"
                  class="text-muted"
                >余额 <span class="tabular-nums text-default">{{ row.original.balanceAfter.toLocaleString() }}</span></span>
                <span
                  v-if="row.original.operatorName"
                  class="text-muted"
                >操作人 {{ row.original.operatorName }}</span>
                <span
                  v-if="row.original.remark"
                  class="text-muted truncate max-w-[280px]"
                  :title="row.original.remark"
                >{{ row.original.remark }}</span>
              </div>
            </template>
          </DashboardDataTable>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
