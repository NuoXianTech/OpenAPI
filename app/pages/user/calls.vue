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
  createdAt: string
}

interface FilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  apiKeys: Array<{ id: number, name: string }>
}

const UBadge = resolveComponent('UBadge')

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
  { label: '成功（2xx/3xx）', value: 'success' },
  { label: '失败（4xx/5xx）', value: 'failure' }
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
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

function statusColor(code: number): 'success' | 'warning' | 'error' | 'neutral' {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'neutral'
  if (code >= 400 && code < 500) return 'warning'
  return 'error'
}

function methodColor(method: string): 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  switch (method) {
    case 'GET': return 'success'
    case 'POST': return 'info'
    case 'PUT':
    case 'PATCH': return 'warning'
    case 'DELETE': return 'error'
    default: return 'neutral'
  }
}

const columns: TableColumn<LogRow>[] = [
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted whitespace-nowrap' }, formatDate(row.original.createdAt))
  },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, {
      color: methodColor(row.original.method),
      variant: 'subtle',
      class: 'font-mono'
    }, () => row.original.method)
  },
  {
    accessorKey: 'apiName',
    header: '服务',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-sm' }, row.original.apiName || '-'),
      h('span', { class: 'font-mono text-xs text-muted' }, row.original.apiPath)
    ])
  },
  {
    accessorKey: 'statusCode',
    header: '状态',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1' }, [
      h(UBadge, {
        color: statusColor(row.original.statusCode),
        variant: 'subtle'
      }, () => row.original.statusCode),
      row.original.statusCode >= 200 && row.original.statusCode < 400
        ? h(UBadge, { color: 'success', variant: 'soft', size: 'sm' }, () => '成功')
        : h(UBadge, { color: 'error', variant: 'soft', size: 'sm' }, () => '失败')
    ])
  },
  {
    accessorKey: 'creditsCost',
    header: '扣除积分',
    cell: ({ row }) => row.original.creditsCost > 0
      ? h(UBadge, { color: 'warning', variant: 'subtle', class: 'tabular-nums' }, () => `-${row.original.creditsCost}`)
      : h('span', { class: 'text-xs text-muted' }, '免费')
  },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-xs' }, `${row.original.latencyMs} ms`)
  },
  {
    accessorKey: 'apiKeyName',
    header: 'API Key',
    cell: ({ row }) => row.original.apiKeyId
      ? h('span', { class: 'text-xs' }, row.original.apiKeyName || `#${row.original.apiKeyId}`)
      : h('span', { class: 'text-xs text-muted italic' }, '未携带')
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.ip || '-')
  },
  {
    id: 'error',
    header: '错误信息',
    cell: ({ row }) => row.original.errorCode || row.original.errorMessage
      ? h('div', { class: 'flex flex-col text-xs' }, [
          row.original.errorCode ? h('span', { class: 'font-mono text-error' }, row.original.errorCode) : null,
          row.original.errorMessage ? h('span', { class: 'text-muted truncate max-w-[200px]' }, row.original.errorMessage) : null
        ].filter(Boolean))
      : h('span', { class: 'text-muted' }, '-')
  }
]

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
</script>

<template>
  <UDashboardPanel id="user-calls">
    <template #header>
      <UDashboardNavbar title="调用日志">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="fetchList"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
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
              <h3 class="font-semibold">
                调用日志
              </h3>
              <span class="ml-auto text-xs text-muted tabular-nums">
                共 {{ total.toLocaleString() }} 条
              </span>
            </div>
          </template>
          <UTable
            :data="items"
            :columns="columns"
            :loading="loading"
            :ui="{
              base: 'table-fixed',
              thead: '[&>tr]:bg-elevated/50',
              th: 'py-2',
              td: 'py-2 align-middle'
            }"
          />
          <div
            v-if="total > pageSize"
            class="flex items-center justify-between pt-3 border-t border-default mt-3"
          >
            <span class="text-xs text-muted">
              第 {{ page }} / {{ totalPages }} 页
            </span>
            <div class="flex gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-mdi-chevron-left"
                :disabled="page <= 1"
                @click="page = Math.max(1, page - 1)"
              >
                上一页
              </UButton>
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                trailing-icon="i-mdi-chevron-right"
                :disabled="page >= totalPages"
                @click="page = Math.min(totalPages, page + 1)"
              >
                下一页
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
