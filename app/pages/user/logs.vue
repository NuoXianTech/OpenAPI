<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useHead({ title: '调用记录' })

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
    label: `${a.name} (${a.apiPath})`,
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

const columns: TableColumn<LogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'method', header: '方法' },
  { accessorKey: 'apiName', header: '服务' },
  { accessorKey: 'statusCode', header: '状态' },
  { accessorKey: 'creditsCost', header: '扣除积分' },
  { accessorKey: 'latencyMs', header: '耗时' },
  { accessorKey: 'apiKeyName', header: 'API Key' },
  { accessorKey: 'ip', header: 'IP' },
  { id: 'error', header: '错误信息' }
]
</script>

<template>
  <UDashboardPanel id="user-calls">
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
      <div class="space-y-6">
        <UCard>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField
              label="服务（API）"
              class="min-w-[220px] flex-1"
            >
              <USelect
                v-model="filters.apiId"
                :items="apiSelectItems"
              />
            </UFormField>
            <UFormField
              label="API Key"
              class="min-w-[180px]"
            >
              <USelect
                v-model="filters.apiKeyId"
                :items="keySelectItems"
              />
            </UFormField>
            <UFormField
              label="状态"
              class="min-w-[160px]"
            >
              <USelect
                v-model="filters.status"
                :items="statusSelectItems"
              />
            </UFormField>
            <div class="flex gap-2">
              <UButton
                icon="i-mdi-magnify"
                @click="applyFilters"
              >
                查询
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                @click="resetFilters"
              >
                重置
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-history"
                class="size-5 text-muted"
              />
              <h3 class="text-lg font-semibold text-highlighted">
                调用日志
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
            :fixed="false"
            empty-title="暂无调用记录"
            empty-icon="i-mdi-history"
          >
            <template #createdAt-cell="{ row }">
              <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
            </template>
            <template #method-cell="{ row }">
              <UBadge
                :color="httpMethodColor(row.original.method)"
                variant="subtle"
                class="font-mono"
              >
                {{ row.original.method }}
              </UBadge>
            </template>
            <template #apiName-cell="{ row }">
              <div class="flex flex-col">
                <span class="font-medium text-sm">{{ row.original.apiName || '-' }}</span>
                <span class="font-mono text-xs text-muted">{{ row.original.apiPath }}</span>
              </div>
            </template>
            <template #statusCode-cell="{ row }">
              <div class="flex items-center gap-1">
                <UBadge
                  :color="httpStatusColor(row.original.statusCode)"
                  variant="subtle"
                >
                  {{ row.original.statusCode }}
                </UBadge>
                <UBadge
                  :color="callOutcomeColor(row.original)"
                  variant="soft"
                  size="sm"
                >
                  {{ callOutcomeLabel(row.original) }}
                </UBadge>
              </div>
            </template>
            <template #creditsCost-cell="{ row }">
              <UBadge
                v-if="row.original.creditsCost > 0"
                color="warning"
                variant="subtle"
                class="tabular-nums"
              >
                -{{ row.original.creditsCost }}
              </UBadge>
              <span
                v-else
                class="text-xs text-muted"
              >免费</span>
            </template>
            <template #latencyMs-cell="{ row }">
              <span class="tabular-nums text-xs">{{ row.original.latencyMs }} ms</span>
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
            <template #ip-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
            </template>
            <template #error-cell="{ row }">
              <div
                v-if="row.original.errorCode || row.original.errorMessage"
                class="flex flex-col text-xs"
              >
                <span
                  v-if="row.original.errorCode"
                  class="font-mono text-error"
                >{{ row.original.errorCode }}</span>
                <span
                  v-if="row.original.errorMessage"
                  class="text-muted truncate max-w-[200px]"
                >{{ row.original.errorMessage }}</span>
              </div>
              <span
                v-else
                class="text-muted"
              >-</span>
            </template>
          </DashboardDataTable>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
