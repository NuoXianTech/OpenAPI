<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useHead({ title: '调用日志' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

interface LogRow {
  id: number
  apiId: number
  apiName: string | null
  apiPath: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  errorCode: string | null
  errorMessage: string | null
  creditsCost: number
  isCounted: boolean
  createdAt: string
}

interface FilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  apiKeys: Array<{ id: number, name: string }>
}

const filters = reactive({
  apiId: 0,
  apiKeyId: 0,
  status: 'all' as 'all' | 'success' | 'failure'
})
const page = ref(1)
const pageSize = ref(50)

const items = ref<LogRow[]>([])
const total = ref(0)
const loading = ref(false)

const filterOptions = ref<FilterOptions>({ apis: [], apiKeys: [] })

const apiSelectItems = computed(() => [
  { label: '全部 API', value: 0 },
  ...filterOptions.value.apis.map(a => ({
    label: `${a.name}（${a.apiPath}）`,
    value: a.id
  }))
])
const keySelectItems = computed(() => [
  { label: '全部 Key', value: 0 },
  ...filterOptions.value.apiKeys.map(k => ({ label: k.name || `#${k.id}`, value: k.id }))
])
const statusSelectItems = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' }
]

const activeFilterCount = computed(() => [
  filters.apiId !== 0,
  filters.apiKeyId !== 0,
  filters.status !== 'all'
].filter(Boolean).length)

async function loadFilters() {
  const res = await $fetch<FilterOptions>('/api/user/calls/filters')
  filterOptions.value = res || { apis: [], apiKeys: [] }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await $fetch<{ items: LogRow[], total: number }>('/api/user/calls/list', {
      query: {
        apiId: filters.apiId || undefined,
        apiKeyId: filters.apiKeyId || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value
      }
    })
    items.value = res?.items || []
    total.value = res?.total || 0
  } catch (err) {
    console.error('failed to fetch user calls list', err)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void fetchList()
}

function resetFilters() {
  filters.apiId = 0
  filters.apiKeyId = 0
  filters.status = 'all'
  page.value = 1
  void fetchList()
}

watch(page, () => {
  void fetchList()
})

onMounted(async () => {
  await loadFilters()
  await fetchList()
})

function formatDate(iso: string) {
  return formatDateTime(iso)
}

function isCallSuccess(row: LogRow) {
  return row.isCounted && row.statusCode >= 200 && row.statusCode < 400 && !row.errorCode
}

function callOutcomeLabel(row: LogRow) {
  if (!row.isCounted) return '未计数'
  return isCallSuccess(row) ? '成功' : '失败'
}

function callOutcomeColor(row: LogRow): 'success' | 'error' | 'neutral' {
  if (!row.isCounted) return 'neutral'
  return isCallSuccess(row) ? 'success' : 'error'
}

function callOutcomeIcon(row: LogRow) {
  if (!row.isCounted) return 'i-mdi-minus-circle-outline'
  return isCallSuccess(row) ? 'i-mdi-check-circle-outline' : 'i-mdi-alert-circle-outline'
}

// ─── 详情弹窗 ───────────────────────────────────────────────────
const detailRow = ref<LogRow | null>(null)
const detailOpen = ref(false)

function openDetail(row: LogRow) {
  detailRow.value = row
  detailOpen.value = true
}

const columns: TableColumn<LogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'apiKeyName', header: '密钥' },
  { accessorKey: 'apiName', header: '接口' },
  { accessorKey: 'creditsCost', header: '费用' },
  { id: 'summary', header: '摘要' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UDashboardPanel id="user-logs">
    <template #header>
      <UDashboardNavbar title="调用日志">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions
            :on-refresh="fetchList"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="log-page-shell space-y-6">
        <section class="log-page-hero relative overflow-hidden rounded-2xl border border-default p-5 sm:p-6">
          <div class="relative z-10 space-y-3">
            <UBadge
              color="neutral"
              variant="solid"
              size="sm"
              class="bg-elevated/80 text-default backdrop-blur"
            >
              Usage logs
            </UBadge>
            <div>
              <h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-highlighted">
                调用日志
              </h2>
              <p class="mt-1 text-sm text-toned">
                你的接口调用流水、扣费结果与请求状态
              </p>
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

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <UFormField label="服务（API）">
                <USelectMenu
                  v-model="filters.apiId"
                  :items="apiSelectItems"
                  value-key="value"
                  searchable
                  placeholder="全部 API"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="API Key">
                <USelect
                  v-model="filters.apiKeyId"
                  :items="keySelectItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="状态">
                <USelect
                  v-model="filters.status"
                  :items="statusSelectItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-mdi-restore"
                @click="resetFilters"
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
        <DashboardDataTable
          v-model:page="page"
          :data="items"
          :columns="columns"
          :loading="loading"
          :page-size="pageSize"
          :total="total"
          empty-title="暂无调用记录"
          empty-icon="i-mdi-text-box-search-outline"
        >
          <template #createdAt-cell="{ row }">
            <div class="flex flex-col gap-1 min-w-[150px]">
              <span class="text-xs whitespace-nowrap">
                {{ formatDate(row.original.createdAt) }}
              </span>
              <UBadge
                :color="callOutcomeColor(row.original)"
                :icon="callOutcomeIcon(row.original)"
                variant="subtle"
                size="sm"
                class="w-fit"
              >
                {{ callOutcomeLabel(row.original) }}
              </UBadge>
            </div>
          </template>

          <template #apiKeyName-cell="{ row }">
            <span
              v-if="row.original.apiKeyName || row.original.apiKeyId"
              class="text-xs"
            >{{ row.original.apiKeyName || `#${row.original.apiKeyId}` }}</span>
            <span
              v-else
              class="text-xs text-muted italic"
            >未携带</span>
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
              class="font-mono text-xs text-muted"
            >{{ row.original.apiPath }}</span>
          </template>

          <template #creditsCost-cell="{ row }">
            <span
              class="tabular-nums text-sm"
              :class="row.original.creditsCost > 0 ? 'text-warning font-medium' : 'text-muted'"
            >
              {{ row.original.creditsCost > 0 ? `-${row.original.creditsCost}` : '免费' }}
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
                  结果
                </div>
                <UBadge
                  :color="callOutcomeColor(detailRow)"
                  :icon="callOutcomeIcon(detailRow)"
                  variant="subtle"
                  size="sm"
                  class="w-fit"
                >
                  {{ callOutcomeLabel(detailRow) }}
                </UBadge>
              </div>
              <div>
                <div class="text-xs text-muted">
                  接口
                </div>
                <div>{{ detailRow.apiName || '-' }}</div>
              </div>
              <div>
                <div class="text-xs text-muted">
                  密钥
                </div>
                <div>
                  {{ detailRow.apiKeyName || (detailRow.apiKeyId ? `#${detailRow.apiKeyId}` : '未携带') }}
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
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  <span>状态码 <span
                    class="tabular-nums"
                    :class="detailRow.statusCode >= 400 ? 'text-error' : 'text-default'"
                  >{{ detailRow.statusCode }}</span></span>
                  <span>耗时 <span class="tabular-nums text-default">{{ detailRow.latencyMs }}ms</span></span>
                  <span>费用 <span class="tabular-nums text-default">{{ detailRow.creditsCost > 0 ? `-${detailRow.creditsCost}` : '免费' }}</span></span>
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
