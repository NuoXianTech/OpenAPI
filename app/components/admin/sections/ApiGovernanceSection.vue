<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'

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
  sourceDir: string | null
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
  costCredits: number
  timeoutMs: number
}

interface DiscoveredApi {
  pathVersion: string
  code: string
  sourceDir: string
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
const UBadge = resolveComponent('UBadge')
const USwitch = resolveComponent('USwitch')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

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
const filterMode = ref<'all' | 'registered' | 'unregistered' | 'orphaned'>('all')

const filteredApis = computed<DiscoveredApi[]>(() => {
  const group = versions.value.find(v => v.pathVersion === activeVersion.value)
  if (!group) return []
  const kw = keyword.value.trim().toLowerCase()
  return group.apis.filter((a) => {
    if (filterMode.value === 'registered' && !a.registered) return false
    if (filterMode.value === 'unregistered' && a.registered) return false
    if (filterMode.value === 'orphaned' && !a.orphaned) return false
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

const deleteOpen = ref(false)
const deleteTarget = ref<DiscoveredApi | null>(null)
const deleteLoading = ref(false)

function openDelete(row: DiscoveredApi) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value?.registered) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/apis/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.registered.id }
    })
    toast.add({ title: '已删除登记', color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
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
  if (row.registered) {
    items.push({
      label: row.orphaned ? '清理孤儿登记' : '删除登记',
      icon: 'i-mdi-delete-outline',
      color: 'error' as const,
      onSelect: () => openDelete(row)
    })
  }
  return items
}

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '已登记', value: 'registered' },
  { label: '未登记', value: 'unregistered' },
  { label: '孤儿', value: 'orphaned' }
]

const columns: TableColumn<DiscoveredApi>[] = [
  {
    accessorKey: 'code',
    header: '编码 / 名称',
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('div', { class: 'font-mono text-sm' }, row.original.code),
      h('div', { class: 'text-xs text-muted truncate max-w-[260px]' },
        row.original.registered?.name || h('span', { class: 'italic opacity-60' }, '未登记'))
    ])
  },
  {
    id: 'endpoints',
    header: '端点',
    cell: ({ row }) => {
      if (row.original.endpoints.length === 0) {
        return h('span', { class: 'text-xs text-muted italic' }, '代码已删除')
      }
      return h('div', { class: 'flex flex-col gap-1' }, row.original.endpoints.map(ep => h('div', {
        class: 'flex items-center gap-2'
      }, [
        h(UBadge, {
          color: methodColor(ep.method),
          variant: 'subtle',
          class: 'font-mono'
        }, () => ep.method),
        h('span', {
          class: 'font-mono text-xs',
          class2: ep.isDynamic ? 'text-primary' : ''
        }, ep.apiPath)
      ])))
    }
  },
  {
    accessorKey: 'sourceDir',
    header: '源目录',
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.sourceDir)
  },
  {
    id: 'category',
    header: '分类',
    cell: ({ row }) => row.original.registered?.categoryId
      ? (categoriesMap.value.get(row.original.registered.categoryId) || `#${row.original.registered.categoryId}`)
      : '-'
  },
  {
    id: 'isEnabled',
    header: '启用',
    cell: ({ row }) => row.original.registered
      ? h(USwitch, {
          'modelValue': row.original.registered.isEnabled,
          'onUpdate:modelValue': (val: boolean) => handleToggle(row.original, 'isEnabled', val)
        })
      : h(UBadge, { color: 'neutral', variant: 'subtle' }, () => '默认停用')
  },
  {
    id: 'isStatistics',
    header: '统计',
    cell: ({ row }) => row.original.registered
      ? h(USwitch, {
          'modelValue': row.original.registered.isStatistics,
          'onUpdate:modelValue': (val: boolean) => handleToggle(row.original, 'isStatistics', val)
        })
      : h('span', { class: 'text-muted' }, '-')
  },
  {
    id: 'isApiKey',
    header: 'ApiKey',
    cell: ({ row }) => row.original.registered
      ? (row.original.registered.isApiKey
          ? h(UBadge, { color: 'warning', variant: 'subtle' }, () => '必需')
          : h(UBadge, { color: 'neutral', variant: 'subtle' }, () => '可选'))
      : h('span', { class: 'text-muted' }, '-')
  },
  {
    id: 'state',
    header: '登记状态',
    cell: ({ row }) => {
      if (row.original.orphaned) return h(UBadge, { color: 'error', variant: 'subtle' }, () => '孤儿')
      if (!row.original.registered) return h(UBadge, { color: 'warning', variant: 'subtle' }, () => '未登记')
      return h(UBadge, { color: 'success', variant: 'subtle' }, () => '已登记')
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' }
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm'
    })))
  }
]

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
      <USelect
        v-model="filterMode"
        :items="filterOptions"
        size="sm"
        class="w-32"
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
      :ui="{
        base: 'table-fixed',
        thead: '[&>tr]:bg-elevated/50',
        th: 'py-2',
        td: 'py-2 align-top'
      }"
    />

    <AdminApiModal
      v-model:open="modalOpen"
      :mode="modalMode"
      :target="modalTarget"
      @saved="refresh()"
    />

    <AdminDeleteModal
      v-model:open="deleteOpen"
      :loading="deleteLoading"
      :title="`删除登记: ${deleteTarget?.code}`"
      description="删除登记后该接口默认拒绝访问。代码文件不会被删除，可随时重新登记。"
      @confirm="confirmDelete"
    />
  </div>
</template>
