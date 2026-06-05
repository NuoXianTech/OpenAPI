<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/clientError'
import { isCidr } from '#shared/utils/cidr'

useHead({ title: 'API Keys' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

interface ApiKey {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  scopes: string[] | null
  ipWhitelist: string[] | null
  totalQuota: number | null
  usedCredits: number | string
  totalCalls: number
  lastUsedAt: string | null
  lastUsedIp: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface ApiOption {
  id: number
  scope: string
  code: string
  pathVersion: string
  name: string
  apiPath: string
  categoryId: number | null
  httpMethod: string
}

type ExpiryPreset = 'never' | '1h' | '1d' | '1mo' | 'custom'

const toast = useToast()

const { data: keysData, status, refresh } = useLazyFetch<ApiKey[]>('/api/user/apikeys/list', {
  default: () => []
})
const items = computed<ApiKey[]>(() => keysData.value || [])

// 接口范围下拉数据（按需懒加载）
const apiOptions = ref<ApiOption[]>([])
let apisLoaded = false
async function ensureApiOptions() {
  if (apisLoaded) return
  try {
    const res = await $fetch<ApiOption[]>('/api/user/apis-list')
    apiOptions.value = res || []
    apisLoaded = true
  } catch (err) {
    toast.add({ title: parseFetchError(err, '加载接口列表失败'), color: 'error' })
  }
}

const scopeSelectItems = computed(() => apiOptions.value.map(o => ({
  label: `${o.name}  ${o.apiPath}`,
  value: o.scope
})))
const scopeLabelMap = computed(() => {
  const m = new Map<string, string>()
  for (const o of apiOptions.value) m.set(o.scope, o.name)
  return m
})

// ------------------------------------------------------------
// 创建
// ------------------------------------------------------------
const createOpen = ref(false)
const creating = ref(false)

const expiryItems: Array<{ label: string, value: ExpiryPreset }> = [
  { label: '永不过期', value: 'never' },
  { label: '1 小时', value: '1h' },
  { label: '1 天', value: '1d' },
  { label: '1 个月', value: '1mo' },
  { label: '自定义', value: 'custom' }
]

function defaultCustomExpiry() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const form = reactive({
  name: '',
  expiryPreset: 'never' as ExpiryPreset,
  expiresAtCustom: defaultCustomExpiry(),
  count: 1,
  unlimitedQuota: true,
  totalQuota: 1000 as number | null,
  scopesMode: 'all' as 'all' | 'pick',
  scopesSelected: [] as string[],
  ipWhitelistText: ''
})

function resetForm() {
  form.name = ''
  form.expiryPreset = 'never'
  form.expiresAtCustom = defaultCustomExpiry()
  form.count = 1
  form.unlimitedQuota = true
  form.totalQuota = 1000
  form.scopesMode = 'all'
  form.scopesSelected = []
  form.ipWhitelistText = ''
}

async function openCreate() {
  resetForm()
  createOpen.value = true
  await ensureApiOptions()
  // 当前默认 scopesMode='all'；若切到 'pick' 时按需把所有项预选上
  form.scopesSelected = apiOptions.value.map(o => o.scope)
}

const ipLineErrors = computed(() => {
  if (!form.ipWhitelistText.trim()) return [] as Array<{ index: number, value: string }>
  const lines = form.ipWhitelistText
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  const errs: Array<{ index: number, value: string }> = []
  lines.forEach((line, i) => {
    if (!isCidr(line)) errs.push({ index: i + 1, value: line })
  })
  return errs
})

const formError = computed(() => {
  if (form.expiryPreset === 'custom' && !form.expiresAtCustom) return '请填写过期时间'
  if (!form.unlimitedQuota) {
    if (form.totalQuota === null || form.totalQuota === undefined || Number(form.totalQuota) < 0) {
      return '请填写有效的积分上限'
    }
  }
  if (form.scopesMode === 'pick' && form.scopesSelected.length === 0) {
    return '请至少选择一个接口，或切回"全部接口"'
  }
  if (ipLineErrors.value.length > 0) {
    return `IP 白名单第 ${ipLineErrors.value.map(e => e.index).join(', ')} 行格式错误`
  }
  return null
})

function computeExpiresAt(): string | null {
  switch (form.expiryPreset) {
    case 'never': return null
    case '1h': return new Date(Date.now() + 60 * 60 * 1000).toISOString()
    case '1d': return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    case '1mo': return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'custom': {
      if (!form.expiresAtCustom) return null
      const d = new Date(form.expiresAtCustom)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
  }
}

function computePayload() {
  const ipList = form.ipWhitelistText
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  return {
    name: form.name.trim() || '默认密钥',
    expiresAt: computeExpiresAt(),
    totalQuota: form.unlimitedQuota ? null : Number(form.totalQuota),
    scopes: form.scopesMode === 'all' ? null : form.scopesSelected,
    ipWhitelist: ipList.length === 0 ? null : ipList,
    count: form.count
  }
}

async function submitCreate() {
  if (formError.value) {
    toast.add({ title: formError.value, color: 'warning' })
    return
  }
  creating.value = true
  try {
    const res = await $fetch<{ keys: ApiKey[], count: number }>('/api/user/apikeys/add', {
      method: 'POST',
      body: computePayload()
    })
    toast.add({
      title: res.count > 1 ? `已生成 ${res.count} 个 API Key` : '已生成新 API Key',
      color: 'success'
    })
    createOpen.value = false
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '创建失败'), color: 'error' })
  } finally {
    creating.value = false
  }
}

// ------------------------------------------------------------
// 编辑
// ------------------------------------------------------------
const editOpen = ref(false)
const isEditing = ref(false)
const editTargetId = ref<number | null>(null)

const editForm = reactive({
  name: '',
  expiryPreset: 'never' as ExpiryPreset,
  expiresAtCustom: defaultCustomExpiry(),
  unlimitedQuota: true,
  totalQuota: 1000 as number | null,
  scopesMode: 'all' as 'all' | 'pick',
  scopesSelected: [] as string[],
  ipWhitelistText: ''
})

function expiresAtToPresetInput(expiresAt: string | null): {
  preset: ExpiryPreset
  custom: string
} {
  if (!expiresAt) return { preset: 'never', custom: defaultCustomExpiry() }
  // 编辑场景下已经签发的 Key 不便回推到「1h / 1d / 1mo」预设——直接进入自定义并把
  // datetime-local 的初值填成当前的 expiresAt（本地时区）
  const d = new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return { preset: 'never', custom: defaultCustomExpiry() }
  const pad = (n: number) => n.toString().padStart(2, '0')
  const custom = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { preset: 'custom', custom }
}

async function openEdit(row: ApiKey) {
  editTargetId.value = row.id
  const expiry = expiresAtToPresetInput(row.expiresAt)
  editForm.name = row.name || ''
  editForm.expiryPreset = expiry.preset
  editForm.expiresAtCustom = expiry.custom
  editForm.unlimitedQuota = row.totalQuota === null || row.totalQuota === undefined
  editForm.totalQuota = row.totalQuota === null || row.totalQuota === undefined ? 1000 : Number(row.totalQuota)
  editForm.scopesMode = row.scopes && row.scopes.length > 0 ? 'pick' : 'all'
  editForm.scopesSelected = row.scopes ? [...row.scopes] : []
  editForm.ipWhitelistText = row.ipWhitelist ? row.ipWhitelist.join('\n') : ''
  editOpen.value = true
  await ensureApiOptions()
  // 切到 pick 但当前选中为空时，预选所有项作为起点
  if (editForm.scopesMode === 'all' && editForm.scopesSelected.length === 0) {
    editForm.scopesSelected = apiOptions.value.map(o => o.scope)
  }
}

const editIpLineErrors = computed(() => {
  if (!editForm.ipWhitelistText.trim()) return [] as Array<{ index: number, value: string }>
  const lines = editForm.ipWhitelistText
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  const errs: Array<{ index: number, value: string }> = []
  lines.forEach((line, i) => {
    if (!isCidr(line)) errs.push({ index: i + 1, value: line })
  })
  return errs
})

const editFormError = computed(() => {
  if (editForm.expiryPreset === 'custom' && !editForm.expiresAtCustom) return '请填写过期时间'
  if (!editForm.unlimitedQuota) {
    if (editForm.totalQuota === null || editForm.totalQuota === undefined || Number(editForm.totalQuota) < 0) {
      return '请填写有效的积分上限'
    }
  }
  if (editForm.scopesMode === 'pick' && editForm.scopesSelected.length === 0) {
    return '请至少选择一个接口，或切回"全部接口"'
  }
  if (editIpLineErrors.value.length > 0) {
    return `IP 白名单第 ${editIpLineErrors.value.map(e => e.index).join(', ')} 行格式错误`
  }
  return null
})

function computeEditExpiresAt(): string | null {
  switch (editForm.expiryPreset) {
    case 'never': return null
    case '1h': return new Date(Date.now() + 60 * 60 * 1000).toISOString()
    case '1d': return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    case '1mo': return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'custom': {
      if (!editForm.expiresAtCustom) return null
      const d = new Date(editForm.expiresAtCustom)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
  }
}

async function submitEdit() {
  if (!editTargetId.value) return
  if (editFormError.value) {
    toast.add({ title: editFormError.value, color: 'warning' })
    return
  }
  const ipList = editForm.ipWhitelistText
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  isEditing.value = true
  try {
    await $fetch('/api/user/apikeys/update', {
      method: 'POST',
      body: {
        id: editTargetId.value,
        name: editForm.name.trim() || '默认密钥',
        expiresAt: computeEditExpiresAt(),
        totalQuota: editForm.unlimitedQuota ? null : Number(editForm.totalQuota),
        scopes: editForm.scopesMode === 'all' ? null : editForm.scopesSelected,
        ipWhitelist: ipList.length === 0 ? null : ipList
      }
    })
    toast.add({ title: '已更新', color: 'success' })
    editOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: parseFetchError(err, '更新失败'), color: 'error' })
  } finally {
    isEditing.value = false
  }
}

// ------------------------------------------------------------
// 重置
// ------------------------------------------------------------
const resetOpen = ref(false)
const resetTarget = ref<ApiKey | null>(null)
const resetLoading = ref(false)
const resetResult = ref<ApiKey | null>(null)

function openReset(row: ApiKey) {
  resetTarget.value = row
  resetResult.value = null
  resetOpen.value = true
}

async function confirmReset() {
  if (!resetTarget.value) return
  resetLoading.value = true
  try {
    const res = await $fetch<ApiKey>('/api/user/apikeys/reset', {
      method: 'POST',
      body: { id: resetTarget.value.id }
    })
    resetResult.value = res || null
    toast.add({ title: '已重置，旧 Key 立即失效', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '重置失败'), color: 'error' })
  } finally {
    resetLoading.value = false
  }
}

// ------------------------------------------------------------
// 删除
// ------------------------------------------------------------
const confirm = useConfirmDialog()

async function toggleActive(row: ApiKey) {
  try {
    await $fetch('/api/user/apikeys/update', {
      method: 'POST',
      body: {
        id: row.id,
        isActive: !row.isActive
      }
    })
    toast.add({ title: row.isActive ? '已停用' : '已启用', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

async function openDelete(row: ApiKey) {
  await confirm({
    title: `删除 API Key: ${row.name || ''}`,
    description: '删除后该 Key 立即失效且不可恢复。',
    onConfirm: async () => {
      try {
        await $fetch('/api/user/apikeys/delete', {
          method: 'POST',
          body: { id: row.id }
        })
        toast.add({ title: '已删除', color: 'success' })
        await refresh()
      } catch (err: unknown) {
        toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
        throw err
      }
    }
  })
}

// ------------------------------------------------------------
// 复制
// ------------------------------------------------------------
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

function maskKey(key: string) {
  if (!key || key.length <= 12) return key
  return `${key.slice(0, 8)}${'•'.repeat(8)}${key.slice(-4)}`
}

function formatDate(val: string | null) {
  return formatDateTime(val, '从未使用')
}

function formatDateOrDash(val: string | null) {
  return formatDateTime(val, '—')
}

function isExpired(row: ApiKey) {
  return row.expiresAt ? new Date(row.expiresAt).getTime() <= Date.now() : false
}

function rowStatus(row: ApiKey): { label: string, color: 'success' | 'warning' | 'neutral' | 'error' } {
  if (row.revokedAt) return { label: '已撤销', color: 'error' }
  if (!row.isActive) return { label: '停用', color: 'neutral' }
  if (isExpired(row)) return { label: '已过期', color: 'warning' }
  return { label: '启用', color: 'success' }
}

function quotaText(row: ApiKey) {
  if (row.totalQuota === null || row.totalQuota === undefined) return '无限'
  const used = Number(row.usedCredits || 0)
  return `${used.toLocaleString()} / ${Number(row.totalQuota).toLocaleString()}`
}

function scopesText(row: ApiKey) {
  if (!row.scopes || row.scopes.length === 0) return '全部接口'
  if (row.scopes.length <= 2) {
    return row.scopes.map(s => scopeLabelMap.value.get(s) || s).join(', ')
  }
  return `${row.scopes.length} 个接口`
}

function ipWhitelistText(row: ApiKey) {
  if (!row.ipWhitelist || row.ipWhitelist.length === 0) return '全部 IP'
  if (row.ipWhitelist.length <= 1) return row.ipWhitelist[0]
  return `${row.ipWhitelist.length} 条 CIDR`
}

function getRowItems(row: ApiKey): DropdownMenuItem[] {
  return [
    { label: '编辑配置', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '复制完整 Key', icon: 'i-mdi-content-copy', onSelect: () => copy(row.apiKey) },
    {
      label: row.isActive ? '停用' : '启用',
      icon: row.isActive ? 'i-mdi-pause-circle-outline' : 'i-mdi-play-circle-outline',
      onSelect: () => toggleActive(row)
    },
    { label: '重置 Key', icon: 'i-mdi-refresh', onSelect: () => openReset(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const showFullKeyId = ref<number | null>(null)
function toggleReveal(id: number) {
  showFullKeyId.value = showFullKeyId.value === id ? null : id
}

const columns: TableColumn<ApiKey>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'apiKey', header: 'API Key' },
  { id: 'quota', header: '配额（已用/总额）' },
  { id: 'scopes', header: '接口范围' },
  { id: 'ipWhitelist', header: 'IP 白名单' },
  { accessorKey: 'totalCalls', header: '调用次数' },
  { accessorKey: 'lastUsedAt', header: '最后使用' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { accessorKey: 'expiresAt', header: '过期时间' },
  { id: 'status', header: '状态' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UDashboardPanel id="user-apikeys">
    <template #header>
      <UDashboardNavbar title="API Key">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            @click="openCreate"
          >
            生成新 Key
          </UButton>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        color="info"
        variant="subtle"
        icon="i-mdi-information-outline"
        title="API Key 使用说明"
        class="mb-4"
      >
        <template #description>
          <ul class="space-y-1.5 text-xs leading-6 list-disc list-inside marker:text-muted">
            <li>
              请求时把 API Key 放在请求头 <UKbd>x-api-key: &lt;your-key&gt;</UKbd> 或 query 参数 <UKbd>?apikey=&lt;your-key&gt;</UKbd> 中。
            </li>
            <li>
              出于安全考虑，列表默认显示遮罩；点击眼睛图标可临时显示完整 Key，仅自己可见。
            </li>
            <li>
              <span class="font-medium text-highlighted">过期</span>的 Key 不会被删除或禁用，调用时会返回到期信息；<span class="font-medium text-highlighted">重置</span>会立即让旧 Key 失效；<span class="font-medium text-highlighted">删除</span>不可恢复。
            </li>
            <li>
              IP 白名单使用 CIDR 格式：单 IP 写成 <UKbd>1.2.3.4/32</UKbd>，网段写成 <UKbd>10.0.0.0/8</UKbd>。
            </li>
          </ul>
        </template>
      </UAlert>

      <DashboardDataTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        :fixed="false"
        empty-title="暂无 API Key"
        empty-icon="i-mdi-key-outline"
      >
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name || '默认密钥' }}</span>
        </template>

        <template #apiKey-cell="{ row }">
          <div class="flex items-center gap-2">
            <code class="font-mono text-xs px-2 py-1 rounded bg-elevated">
              {{ showFullKeyId === row.original.id ? row.original.apiKey : maskKey(row.original.apiKey) }}
            </code>
            <UButton
              :icon="showFullKeyId === row.original.id ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="toggleReveal(row.original.id)"
            />
            <UButton
              icon="i-mdi-content-copy"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="copy(row.original.apiKey)"
            />
          </div>
        </template>

        <template #quota-cell="{ row }">
          <span
            class="tabular-nums text-xs"
            :class="row.original.totalQuota === null ? 'text-muted' : ''"
          >{{ quotaText(row.original) }}</span>
        </template>

        <template #scopes-cell="{ row }">
          <UTooltip
            v-if="row.original.scopes && row.original.scopes.length > 0"
            :text="row.original.scopes.map(s => scopeLabelMap.get(s) || s).join('\n')"
            :content="{ side: 'top' }"
          >
            <UBadge
              variant="soft"
              color="neutral"
              class="cursor-help"
            >
              {{ scopesText(row.original) }}
            </UBadge>
          </UTooltip>
          <span
            v-else
            class="text-xs text-muted"
          >全部接口</span>
        </template>

        <template #ipWhitelist-cell="{ row }">
          <UTooltip
            v-if="row.original.ipWhitelist && row.original.ipWhitelist.length > 0"
            :text="row.original.ipWhitelist.join('\n')"
            :content="{ side: 'top' }"
          >
            <UBadge
              variant="soft"
              color="neutral"
              class="cursor-help font-mono"
            >
              {{ ipWhitelistText(row.original) }}
            </UBadge>
          </UTooltip>
          <span
            v-else
            class="text-xs text-muted"
          >全部 IP</span>
        </template>

        <template #totalCalls-cell="{ row }">
          <span class="tabular-nums">{{ (row.original.totalCalls || 0).toLocaleString() }}</span>
        </template>

        <template #lastUsedAt-cell="{ row }">
          <div class="flex flex-col text-xs">
            <span>{{ formatDate(row.original.lastUsedAt) }}</span>
            <span
              v-if="row.original.lastUsedIp"
              class="text-muted font-mono"
            >{{ row.original.lastUsedIp }}</span>
          </div>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted">{{ formatDate(row.original.createdAt) }}</span>
        </template>

        <template #expiresAt-cell="{ row }">
          <span
            class="text-xs"
            :class="isExpired(row.original) ? 'text-warning' : 'text-muted'"
          >{{ formatDateOrDash(row.original.expiresAt) }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="rowStatus(row.original).color"
            variant="subtle"
          >
            {{ rowStatus(row.original).label }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <DashboardRowActions :items="getRowItems(row.original)" />
        </template>
      </DashboardDataTable>

      <!-- 创建 Key -->
      <UModal
        v-model:open="createOpen"
        title="生成新 API Key"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <div class="space-y-4">
            <!-- 基础 -->
            <div class="grid grid-cols-3 gap-3">
              <UFormField
                label="名称"
                class="col-span-2"
                help="批量生成 > 1 个时，首个使用此名称，其余自动追加后缀"
              >
                <UInput
                  v-model="form.name"
                  placeholder="例如：默认密钥 / 生产密钥"
                  :maxlength="80"
                />
              </UFormField>
              <UFormField
                label="生成数量"
                help="一次最多 5 个"
              >
                <UInput
                  v-model.number="form.count"
                  type="number"
                  :min="1"
                  :max="5"
                />
              </UFormField>
            </div>

            <!-- 过期时间 -->
            <UFormField label="过期时间">
              <URadioGroup
                v-model="form.expiryPreset"
                orientation="horizontal"
                :items="expiryItems"
              />
              <UInput
                v-if="form.expiryPreset === 'custom'"
                v-model="form.expiresAtCustom"
                type="datetime-local"
                class="mt-2"
              />
              <p class="text-xs text-muted mt-1">
                过期后 Key 不会被删除或禁用，调用接口时会返回到期信息。
              </p>
            </UFormField>

            <!-- 配额 -->
            <UFormField label="积分配额">
              <div class="flex items-center gap-3">
                <USwitch
                  v-model="form.unlimitedQuota"
                  label="无限配额"
                />
                <UInput
                  v-if="!form.unlimitedQuota"
                  v-model.number="form.totalQuota"
                  type="number"
                  :min="0"
                  placeholder="累计可消耗积分上限"
                  class="flex-1"
                />
              </div>
              <p class="text-xs text-muted mt-1">
                该 Key 累计消耗积分达到上限后将拒绝调用；资金仍从钱包扣除。
              </p>
            </UFormField>

            <!-- 接口范围 -->
            <UFormField label="接口范围">
              <URadioGroup
                v-model="form.scopesMode"
                orientation="horizontal"
                :items="[
                  { label: '全部接口', value: 'all' },
                  { label: '指定接口', value: 'pick' }
                ]"
              />
              <USelectMenu
                v-if="form.scopesMode === 'pick'"
                v-model="form.scopesSelected"
                :items="scopeSelectItems"
                multiple
                searchable
                value-key="value"
                placeholder="选择允许调用的接口"
                class="mt-2 w-full"
              />
            </UFormField>

            <!-- IP 白名单 -->
            <UFormField
              label="IP 白名单（CIDR）"
              :help="ipLineErrors.length > 0
                ? `第 ${ipLineErrors.map(e => e.index).join(', ')} 行格式错误`
                : '每行一条 CIDR，例如 1.2.3.4/32 / 10.0.0.0/8；留空 = 不限'"
              :error="ipLineErrors.length > 0"
            >
              <UTextarea
                v-model="form.ipWhitelistText"
                :rows="3"
                placeholder="1.2.3.4/32&#10;10.0.0.0/8"
                class="font-mono text-xs"
              />
            </UFormField>

            <UAlert
              v-if="formError"
              :title="formError"
              color="warning"
              variant="subtle"
              icon="i-mdi-alert-outline"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="createOpen = false"
            >
              取消
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!!formError"
              @click="submitCreate"
            >
              生成
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- 编辑 Key -->
      <UModal
        v-model:open="editOpen"
        title="编辑 API Key"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField
              label="名称"
              help="仅展示用，不影响 Key 字符串本身"
            >
              <UInput
                v-model="editForm.name"
                placeholder="例如：默认密钥 / 生产密钥"
                :maxlength="80"
              />
            </UFormField>

            <UFormField label="过期时间">
              <URadioGroup
                v-model="editForm.expiryPreset"
                orientation="horizontal"
                :items="expiryItems"
              />
              <UInput
                v-if="editForm.expiryPreset === 'custom'"
                v-model="editForm.expiresAtCustom"
                type="datetime-local"
                class="mt-2"
              />
              <p class="text-xs text-muted mt-1">
                选择「永不过期」会清空过期时间；选择预设会从当前时间起算。
              </p>
            </UFormField>

            <UFormField label="积分配额">
              <div class="flex items-center gap-3">
                <USwitch
                  v-model="editForm.unlimitedQuota"
                  label="无限配额"
                />
                <UInput
                  v-if="!editForm.unlimitedQuota"
                  v-model.number="editForm.totalQuota"
                  type="number"
                  :min="0"
                  placeholder="累计可消耗积分上限"
                  class="flex-1"
                />
              </div>
              <p class="text-xs text-muted mt-1">
                修改上限不会重置已消耗积分；若新上限低于已消耗，Key 将立即停止可用直至再次提高。
              </p>
            </UFormField>

            <UFormField label="接口范围">
              <URadioGroup
                v-model="editForm.scopesMode"
                orientation="horizontal"
                :items="[
                  { label: '全部接口', value: 'all' },
                  { label: '指定接口', value: 'pick' }
                ]"
              />
              <USelectMenu
                v-if="editForm.scopesMode === 'pick'"
                v-model="editForm.scopesSelected"
                :items="scopeSelectItems"
                multiple
                searchable
                value-key="value"
                placeholder="选择允许调用的接口"
                class="mt-2 w-full"
              />
            </UFormField>

            <UFormField
              label="IP 白名单（CIDR）"
              :help="editIpLineErrors.length > 0
                ? `第 ${editIpLineErrors.map(e => e.index).join(', ')} 行格式错误`
                : '每行一条 CIDR；留空 = 不限'"
              :error="editIpLineErrors.length > 0"
            >
              <UTextarea
                v-model="editForm.ipWhitelistText"
                :rows="3"
                placeholder="1.2.3.4/32&#10;10.0.0.0/8"
                class="font-mono text-xs"
              />
            </UFormField>

            <UAlert
              v-if="editFormError"
              :title="editFormError"
              color="warning"
              variant="subtle"
              icon="i-mdi-alert-outline"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="editOpen = false"
            >
              取消
            </UButton>
            <UButton
              :loading="isEditing"
              :disabled="!!editFormError"
              @click="submitEdit"
            >
              保存
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- 重置 Key -->
      <UModal
        v-model:open="resetOpen"
        :title="resetResult ? '已重置，请保存新 Key' : '确认重置 API Key'"
        :ui="{ content: 'sm:max-w-md' }"
      >
        <template #body>
          <template v-if="!resetResult">
            <UAlert
              color="warning"
              variant="subtle"
              title="重置将立即让旧 Key 失效"
              :description="`将重置「${resetTarget?.name || '默认密钥'}」，所有正在使用旧 Key 的调用方会立刻失败，请确认后再继续。`"
              icon="i-mdi-alert-outline"
            />
          </template>
          <template v-else>
            <code class="block font-mono text-sm break-all p-3 rounded bg-elevated">
              {{ resetResult.apiKey }}
            </code>
          </template>
        </template>

        <template #footer>
          <div
            v-if="!resetResult"
            class="flex justify-end gap-2 w-full"
          >
            <UButton
              variant="outline"
              color="neutral"
              @click="resetOpen = false"
            >
              取消
            </UButton>
            <UButton
              color="warning"
              :loading="resetLoading"
              @click="confirmReset"
            >
              确认重置
            </UButton>
          </div>
          <div
            v-else
            class="flex justify-end gap-2 w-full"
          >
            <UButton
              variant="outline"
              color="neutral"
              icon="i-mdi-content-copy"
              @click="copy(resetResult.apiKey)"
            >
              复制
            </UButton>
            <UButton @click="resetOpen = false">
              我已保存
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
