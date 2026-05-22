<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

interface DiscoveredEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  isDynamic: boolean
}

interface RegisteredApi {
  id: number
  code: string
  pathVersion: string
  name: string
  shortDesc: string
  description: string
  apiPath: string
  httpMethod: string
  endpointCount: number
  docUrl: string
  status: number
  categoryId: number | null
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  dailyQuota: number
  methodCosts: Record<string, number>
  timeoutMs: number
}

interface DiscoveredApi {
  pathVersion: string
  code: string
  endpointCount: number
  endpoints: DiscoveredEndpoint[]
  registered: RegisteredApi | null
  orphaned: boolean
}

interface VersionGroup {
  pathVersion: string
  apis: DiscoveredApi[]
  stats: { total: number, registered: number, unregistered: number, orphaned: number }
}

const toast = useToast()

const { data, status, refresh } = useLazyFetch('/api/admin/apis/discover', {
  default: () => ({ versions: [] as VersionGroup[] })
})

const { data: categoriesData } = useLazyFetch<Array<{ id: number, name: string }>>('/api/admin/api-categories/list', {
  default: () => []
})
const categoriesMap = computed(() => {
  const map = new Map<number, string>()
  for (const cat of (categoriesData.value || [])) map.set(cat.id, cat.name)
  return map
})

const versions = computed<VersionGroup[]>(() => (data.value?.versions || []) as VersionGroup[])
const activeVersion = ref<string>('')
watchEffect(() => {
  if (!activeVersion.value && versions.value.length > 0) {
    activeVersion.value = versions.value[0]!.pathVersion
  }
})

const keyword = ref('')

const filteredApis = computed<DiscoveredApi[]>(() => {
  const group = versions.value.find(v => v.pathVersion === activeVersion.value)
  if (!group) return []
  const kw = keyword.value.trim().toLowerCase()
  return group.apis.filter((a) => {
    if (!kw) return true
    return (
      a.code.toLowerCase().includes(kw)
      || (a.registered?.name || '').toLowerCase().includes(kw)
      || (a.registered?.shortDesc || '').toLowerCase().includes(kw)
    )
  })
})

const versionItems = computed(() => versions.value.map(v => ({
  label: `${v.pathVersion} (${v.stats.registered}/${v.stats.total})`,
  value: v.pathVersion
})))

const modalOpen = ref(false)
const modalMode = ref<'register' | 'edit'>('register')
const modalTarget = ref<DiscoveredApi | null>(null)

function openRegister(row: DiscoveredApi) {
  modalMode.value = 'register'
  modalTarget.value = row
  modalOpen.value = true
}

function openEdit(row: DiscoveredApi) {
  modalMode.value = 'edit'
  modalTarget.value = row
  modalOpen.value = true
}

async function handleToggle(row: DiscoveredApi, field: 'isEnabled' | 'isStatistics', value: boolean) {
  if (!row.registered) return
  try {
    await $fetch('/api/admin/apis/toggle', {
      method: 'PUT',
      body: { id: row.registered.id, field, value }
    })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '切换失败'), color: 'error' })
  }
}

async function resyncManifest(row: DiscoveredApi) {
  try {
    await $fetch('/api/admin/apis/register', {
      method: 'POST',
      body: { pathVersion: row.pathVersion, code: row.code }
    })
    toast.add({ title: '已同步 manifest', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '同步失败'), color: 'error' })
  }
}

function getRowItems(row: DiscoveredApi): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = []
  if (row.registered && !row.orphaned) {
    items.push({
      label: '编辑配置',
      icon: 'i-mdi-pencil-outline',
      onSelect: () => openEdit(row)
    }, {
      label: '同步路由信息',
      icon: 'i-mdi-sync',
      onSelect: () => resyncManifest(row)
    })
  }
  if (!row.registered) {
    items.push({
      label: '登记接口',
      icon: 'i-mdi-plus-circle-outline',
      onSelect: () => openRegister(row)
    })
  }
  return items
}

const columns: TableColumn<DiscoveredApi>[] = [
  { accessorKey: 'code', header: '编码 / 名称' },
  { id: 'endpoints', header: '端点' },
  { id: 'category', header: '分类' },
  { id: 'isEnabled', header: '启用' },
  { id: 'isStatistics', header: '统计' },
  { id: 'isApiKey', header: 'ApiKey' },
  { id: 'actions', header: '' }
]

function categoryLabel(row: DiscoveredApi) {
  const id = row.registered?.categoryId
  if (!id) return '-'
  return categoriesMap.value.get(id) || `#${id}`
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
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 flex-wrap">
      <USelect
        v-if="versionItems.length > 0"
        v-model="activeVersion"
        :items="versionItems"
        size="sm"
        class="w-44"
      />
      <UInput
        v-model="keyword"
        icon="i-mdi-magnify"
        placeholder="搜索 code / 名称..."
        size="sm"
        class="max-w-sm"
      />
      <UButton
        class="ml-auto"
        color="neutral"
        variant="outline"
        icon="i-mdi-refresh"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <div
      v-if="versions.length === 0 && status !== 'pending'"
      class="text-center py-12 text-muted"
    >
      未发现任何 v{N} 版本目录。请在 server/routes/v1/ 下创建接口目录后重启 dev 服务。
    </div>

    <UTable
      v-else
      :data="filteredApis"
      :columns="columns"
      :loading="status === 'pending'"
      class="shrink-0"
    >
      <template #code-cell="{ row }">
        <div class="flex flex-col gap-0.5">
          <div class="font-mono text-sm">
            {{ row.original.code }}
          </div>
          <div class="text-xs text-muted truncate max-w-[260px]">
            <template v-if="row.original.registered?.name">
              {{ row.original.registered.name }}
            </template>
            <span
              v-else
              class="italic opacity-60"
            >未登记</span>
          </div>
        </div>
      </template>
      <template #endpoints-cell="{ row }">
        <span
          v-if="row.original.endpoints.length === 0"
          class="text-xs text-muted italic"
        >代码已删除</span>
        <div
          v-else
          class="flex flex-col gap-1"
        >
          <div
            v-for="ep in row.original.endpoints"
            :key="`${ep.method}-${ep.apiPath}`"
            class="flex items-center gap-2"
          >
            <UBadge
              :color="methodColor(ep.method)"
              variant="subtle"
              class="font-mono"
            >
              {{ ep.method }}
            </UBadge>
            <span
              class="font-mono text-xs"
              :class="ep.isDynamic ? 'text-primary' : ''"
            >{{ ep.apiPath }}</span>
          </div>
        </div>
      </template>
      <template #category-cell="{ row }">
        {{ categoryLabel(row.original) }}
      </template>
      <template #isEnabled-cell="{ row }">
        <USwitch
          v-if="row.original.registered"
          :model-value="row.original.registered.isEnabled"
          @update:model-value="(val: boolean) => handleToggle(row.original, 'isEnabled', val)"
        />
        <UBadge
          v-else
          color="neutral"
          variant="subtle"
        >
          默认停用
        </UBadge>
      </template>
      <template #isStatistics-cell="{ row }">
        <USwitch
          v-if="row.original.registered"
          :model-value="row.original.registered.isStatistics"
          @update:model-value="(val: boolean) => handleToggle(row.original, 'isStatistics', val)"
        />
        <span
          v-else
          class="text-muted"
        >-</span>
      </template>
      <template #isApiKey-cell="{ row }">
        <UBadge
          v-if="row.original.registered"
          :color="row.original.registered.isApiKey ? 'warning' : 'neutral'"
          variant="subtle"
        >
          {{ row.original.registered.isApiKey ? '必需' : '可选' }}
        </UBadge>
        <span
          v-else
          class="text-muted"
        >-</span>
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
    </UTable>

    <AdminApiModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :target="modalTarget"
      @saved="refresh()"
    />
  </div>
</template>
