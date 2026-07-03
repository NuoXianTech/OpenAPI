<script setup lang="ts">
import type { AdminUserItem } from '~/composables/admin/useAdminUsersPage'
import { parseFetchError } from '#shared/utils/client-error'
import { useApiKeys } from '~/composables/api/useApiKeys'
import { useApiKeyForm } from '~/composables/api/useApiKeyForm'
import type { ApiKeyItem } from '~/composables/api/types'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()
const keys = ref<ApiKeyItem[]>([])
const loading = ref(false)

async function load() {
  if (!props.target) return
  loading.value = true
  try {
    keys.value = (await $fetch<ApiKeyItem[]>('/api/admin/users/apikeys', { query: { userId: props.target.id } })) || []
  } catch {
    keys.value = []
  } finally {
    loading.value = false
  }
}

// 数据层：接口范围下拉 + CRUD（admin 端点；创建时按 target 用户定位；成功后 refresh=load）
const {
  scopeSelectItems,
  scopeLabelMap,
  allScopes,
  ensureScopeOptions,
  create: createKey,
  update: updateKey,
  reset: resetKey,
  remove: removeKey
} = useApiKeys({ scope: 'admin', getUserId: () => props.target?.id, refresh: load })

// 创建 / 编辑共用同一份表单（editingId 非 null 即编辑）
const {
  form,
  reset: resetForm,
  loadFrom,
  preselectAllScopes,
  ipLineErrors,
  error: formError,
  buildPayload
} = useApiKeyForm()

const formOpen = ref(false)
const creating = ref(false)
const editingId = ref<number | null>(null)

watch(() => [props.open, props.target?.id] as const, ([isOpen]) => {
  if (isOpen) {
    void load()
    void ensureScopeOptions()
    resetForm()
    creating.value = false
    formOpen.value = false
    editingId.value = null
  }
})

function toggleForm() {
  formOpen.value = !formOpen.value
  if (formOpen.value) {
    editingId.value = null
    resetForm()
    form.scopesSelected = [...allScopes.value]
  }
}

function openEditForm(key: ApiKeyItem) {
  editingId.value = key.id
  loadFrom(key)
  formOpen.value = true
  preselectAllScopes(allScopes.value)
}

async function submitForm() {
  if (!props.target) return
  if (formError.value) {
    toast.add({ title: formError.value, color: 'warning' })
    return
  }
  creating.value = true
  try {
    if (editingId.value) {
      await updateKey(editingId.value, buildPayload())
      toast.add({ title: '已更新', color: 'success' })
    } else {
      const res = await createKey({ ...buildPayload(), count: form.count })
      toast.add({
        title: res.count > 1 ? `已生成 ${res.count} 个 API Key` : '已生成新 API Key',
        color: 'success'
      })
    }
    formOpen.value = false
    editingId.value = null
    resetForm()
  } catch (err) {
    toast.add({ title: parseFetchError(err, editingId.value ? '更新失败' : '创建失败'), color: 'error' })
  } finally {
    creating.value = false
  }
}

async function resetKeyAction(id: number) {
  try {
    await resetKey(id)
    toast.add({ title: 'API Key 已重置', color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, '重置失败'), color: 'error' })
  }
}

async function toggleActive(key: ApiKeyItem) {
  try {
    await updateKey(key.id, { isActive: !key.isActive })
    toast.add({ title: key.isActive ? 'API Key 已停用' : 'API Key 已启用', color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

async function removeKeyAction(id: number) {
  try {
    await removeKey(id)
    toast.add({ title: 'API Key 已删除', color: 'success' })
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

const showFullKeyId = ref<number | null>(null)
function toggleReveal(id: number) {
  showFullKeyId.value = showFullKeyId.value === id ? null : id
}

function formatExpiry(val: string | null) {
  return formatDateTime(val, '永不过期')
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
          class="text-xs text-muted"
        >
          编辑 Key #{{ editingId }} · 不会更换 Key 字符串本身
        </div>

        <ApiKeyFormFields
          v-model="form"
          :scope-select-items="scopeSelectItems"
          :ip-line-errors="ipLineErrors"
          :error="formError"
          :show-count="!editingId"
          size="sm"
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
                  v-if="isApiKeyExpired(key)"
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
                  {{ showFullKeyId === key.id ? key.apiKey : maskApiKey(key.apiKey) }}
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
                @click="resetKeyAction(key.id)"
              >
                重置
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="error"
                @click="removeKeyAction(key.id)"
              >
                删除
              </UButton>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
            <div>过期：{{ formatExpiry(key.expiresAt) }}</div>
            <div>配额：{{ apiKeyQuotaText(key) }}</div>
            <div>接口：{{ apiKeyScopesText(key.scopes, scopeLabelMap) }}</div>
            <div>IP：{{ apiKeyIpText(key.ipWhitelist) }}</div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
