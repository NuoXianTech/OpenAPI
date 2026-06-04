<script setup lang="ts">
import type { AdminUserItem, AdminApiKeyItem } from '~/composables/admin/useAdminUsersPage'
import { parseFetchError } from '#shared/utils/clientError'
import { isCidr } from '#shared/utils/cidr'

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

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()
const keys = ref<AdminApiKeyItem[]>([])
const loading = ref(false)
const showFullKeyId = ref<number | null>(null)

const apiOptions = ref<ApiOption[]>([])
let apisLoaded = false
async function ensureApiOptions() {
  if (apisLoaded) return
  try {
    const res = await $fetch<ApiOption[]>('/api/admin/apis-list')
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

async function load() {
  if (!props.target) return
  loading.value = true
  try {
    const res = await $fetch<AdminApiKeyItem[]>('/api/admin/users/apikeys', { query: { userId: props.target.id } })
    keys.value = res || []
  } catch {
    keys.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.target?.id] as const, ([isOpen]) => {
  if (isOpen) {
    void load()
    void ensureApiOptions()
    resetForm()
    creating.value = false
    formOpen.value = false
  }
})

// ------------------------------------------------------------
// 创建 / 编辑（共用同一份表单，编辑时 editingId 非 null）
// ------------------------------------------------------------
const formOpen = ref(false)
const creating = ref(false)
const editingId = ref<number | null>(null)

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

function toggleForm() {
  formOpen.value = !formOpen.value
  if (formOpen.value) {
    editingId.value = null
    resetForm()
    form.scopesSelected = apiOptions.value.map(o => o.scope)
  }
}

function expiresAtToPresetInput(expiresAt: string | null): {
  preset: ExpiryPreset
  custom: string
} {
  if (!expiresAt) return { preset: 'never', custom: defaultCustomExpiry() }
  const d = new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return { preset: 'never', custom: defaultCustomExpiry() }
  const pad = (n: number) => n.toString().padStart(2, '0')
  const custom = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { preset: 'custom', custom }
}

function openEditForm(key: AdminApiKeyItem) {
  editingId.value = key.id
  const expiry = expiresAtToPresetInput(key.expiresAt)
  form.name = key.name || ''
  form.expiryPreset = expiry.preset
  form.expiresAtCustom = expiry.custom
  form.count = 1
  form.unlimitedQuota = key.totalQuota === null || key.totalQuota === undefined
  form.totalQuota = key.totalQuota === null || key.totalQuota === undefined ? 1000 : Number(key.totalQuota)
  form.scopesMode = key.scopes && key.scopes.length > 0 ? 'pick' : 'all'
  form.scopesSelected = key.scopes ? [...key.scopes] : []
  form.ipWhitelistText = key.ipWhitelist ? key.ipWhitelist.join('\n') : ''
  formOpen.value = true
  if (form.scopesMode === 'all' && form.scopesSelected.length === 0) {
    form.scopesSelected = apiOptions.value.map(o => o.scope)
  }
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

async function submitForm() {
  if (!props.target) return
  if (formError.value) {
    toast.add({ title: formError.value, color: 'warning' })
    return
  }
  const ipList = form.ipWhitelistText
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  creating.value = true
  try {
    if (editingId.value) {
      await $fetch('/api/admin/users/apikeys/update', {
        method: 'POST',
        body: {
          id: editingId.value,
          name: form.name.trim() || '默认密钥',
          expiresAt: computeExpiresAt(),
          totalQuota: form.unlimitedQuota ? null : Number(form.totalQuota),
          scopes: form.scopesMode === 'all' ? null : form.scopesSelected,
          ipWhitelist: ipList.length === 0 ? null : ipList
        }
      })
      toast.add({ title: '已更新', color: 'success' })
    } else {
      const res = await $fetch<{ keys: AdminApiKeyItem[], count: number }>('/api/admin/users/apikeys/add', {
        method: 'POST',
        body: {
          userId: props.target.id,
          name: form.name.trim() || '默认密钥',
          expiresAt: computeExpiresAt(),
          totalQuota: form.unlimitedQuota ? null : Number(form.totalQuota),
          scopes: form.scopesMode === 'all' ? null : form.scopesSelected,
          ipWhitelist: ipList.length === 0 ? null : ipList,
          count: form.count
        }
      })
      toast.add({
        title: res.count > 1 ? `已生成 ${res.count} 个 API Key` : '已生成新 API Key',
        color: 'success'
      })
    }
    formOpen.value = false
    editingId.value = null
    resetForm()
    await load()
  } catch (err) {
    toast.add({ title: parseFetchError(err, editingId.value ? '更新失败' : '创建失败'), color: 'error' })
  } finally {
    creating.value = false
  }
}

async function reset(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已重置', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: parseFetchError(err, '重置失败'), color: 'error' })
  }
}

async function toggleActive(key: AdminApiKeyItem) {
  try {
    await $fetch('/api/admin/users/apikeys/update', {
      method: 'POST',
      body: {
        id: key.id,
        isActive: !key.isActive
      }
    })
    toast.add({ title: key.isActive ? 'API Key 已停用' : 'API Key 已启用', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

async function remove(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已删除', color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
  }
}

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

function toggleReveal(id: number) {
  showFullKeyId.value = showFullKeyId.value === id ? null : id
}

function formatDateOrDash(val: string | null) {
  return formatDateTime(val, '永不过期')
}

function isExpired(row: AdminApiKeyItem) {
  return row.expiresAt ? new Date(row.expiresAt).getTime() <= Date.now() : false
}

function quotaText(row: AdminApiKeyItem) {
  if (row.totalQuota === null || row.totalQuota === undefined) return '无限'
  const used = Number(row.usedCredits || 0)
  return `${used.toLocaleString()} / ${Number(row.totalQuota).toLocaleString()}`
}

function scopesSummary(row: AdminApiKeyItem) {
  if (!row.scopes || row.scopes.length === 0) return '全部接口'
  return `${row.scopes.length} 个接口`
}

function ipSummary(row: AdminApiKeyItem) {
  if (!row.ipWhitelist || row.ipWhitelist.length === 0) return '全部 IP'
  return `${row.ipWhitelist.length} 条 CIDR`
}
</script>

<template>
  <UModal
    :open="open"
    :title="`${target?.username ?? ''} 的 API Keys`"
    :ui="{ content: 'sm:max-w-3xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex justify-end mb-3">
        <UButton
          size="sm"
          :icon="formOpen ? 'i-mdi-close' : 'i-mdi-plus'"
          :variant="formOpen ? 'outline' : 'solid'"
          @click="toggleForm"
        >
          {{ formOpen ? '收起' : '新增' }}
        </UButton>
      </div>

      <!-- 创建 / 编辑表单 · 折叠区 -->
      <div
        v-if="formOpen"
        class="rounded-lg border border-default p-3 mb-4 space-y-3"
      >
        <div
          v-if="editingId"
          class="text-xs text-muted -mb-1"
        >
          编辑 Key #{{ editingId }} · 不会更换 Key 字符串本身
        </div>
        <div class="grid grid-cols-3 gap-3">
          <UFormField
            label="名称"
            class="col-span-2"
          >
            <UInput
              v-model="form.name"
              placeholder="默认密钥"
              :maxlength="80"
              size="sm"
            />
          </UFormField>
          <UFormField
            v-if="!editingId"
            label="生成数量"
          >
            <UInput
              v-model.number="form.count"
              type="number"
              :min="1"
              :max="5"
              size="sm"
            />
          </UFormField>
        </div>

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
            size="sm"
          />
        </UFormField>

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
              size="sm"
            />
          </div>
        </UFormField>

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
            size="sm"
          />
        </UFormField>

        <UFormField
          label="IP 白名单（CIDR）"
          :help="ipLineErrors.length > 0
            ? `第 ${ipLineErrors.map(e => e.index).join(', ')} 行格式错误`
            : '每行一条；留空 = 不限'"
          :error="ipLineErrors.length > 0"
        >
          <UTextarea
            v-model="form.ipWhitelistText"
            :rows="2"
            placeholder="1.2.3.4/32"
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

        <div class="flex justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            @click="formOpen = false"
          >
            取消
          </UButton>
          <UButton
            size="sm"
            :loading="creating"
            :disabled="!!formError"
            @click="submitForm"
          >
            {{ editingId ? '保存' : '生成' }}
          </UButton>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-sm text-muted py-4 text-center"
      >
        加载中...
      </div>
      <div
        v-else-if="keys.length === 0"
        class="text-sm text-muted py-4 text-center"
      >
        暂无 API Key
      </div>
      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="key in keys"
          :key="key.id"
          class="rounded-lg border border-default p-3"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium">{{ key.name }}</span>
                <UBadge
                  v-if="isExpired(key)"
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  已过期
                </UBadge>
                <UBadge
                  v-else-if="!key.isActive"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  停用
                </UBadge>
              </div>
              <div class="flex items-center gap-1">
                <code class="font-mono text-xs px-2 py-1 rounded bg-elevated truncate">
                  {{ showFullKeyId === key.id ? key.apiKey : maskKey(key.apiKey) }}
                </code>
                <UButton
                  :icon="showFullKeyId === key.id ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="toggleReveal(key.id)"
                />
                <UButton
                  icon="i-mdi-content-copy"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="copy(key.apiKey)"
                />
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="openEditForm(key)"
              >
                编辑
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="toggleActive(key)"
              >
                {{ key.isActive ? '停用' : '启用' }}
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="reset(key.id)"
              >
                重置
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="error"
                @click="remove(key.id)"
              >
                删除
              </UButton>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
            <div>过期：{{ formatDateOrDash(key.expiresAt) }}</div>
            <div>配额：{{ quotaText(key) }}</div>
            <div>接口：{{ scopesSummary(key) }}</div>
            <div>IP：{{ ipSummary(key) }}</div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
