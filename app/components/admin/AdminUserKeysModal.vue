<script setup lang="ts">
import { LazyApiKeyResetModal, LazyApiKeySecretModal } from '#components'
import type { AdminUserItem } from '~/composables/admin/use-admin-users-page'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { useApiKeys } from '~/composables/api/use-api-keys'
import { useApiKeyForm } from '~/composables/api/use-api-key-form'
import { useApiKeyDisplay } from '~/composables/api/use-api-key-display'
import type { ApiKeyItem } from '#shared/types/api'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()
const { t, locale } = useI18n()
const overlay = useOverlay()
const resetModal = overlay.create(LazyApiKeyResetModal, { destroyOnClose: true })
const secretModal = overlay.create(LazyApiKeySecretModal, { destroyOnClose: true })
const {
  getIpText,
  getQuotaText,
  getScopesText,
  getStatus
} = useApiKeyDisplay()
const keys = ref<ApiKeyItem[]>([])
const loading = ref(false)

async function load() {
  if (!props.target) return
  loading.value = true
  try {
    keys.value = (await $fetch<ApiKeyItem[]>('/api/admin/users/apikeys', { query: { userId: props.target.id } })) || []
  } catch (error) {
    keys.value = []
    toast.add({
      title: parseFetchError(error, t('admin.users.apiKeys.loadFailed')),
      color: 'error'
    })
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
      toast.add({ title: t('common.feedback.updated'), color: 'success' })
    } else {
      const res = await createKey({ ...buildPayload(), count: form.count })
      toast.add({
        title: res.count > 1
          ? t('admin.users.apiKeys.feedback.createdMany', { count: res.count })
          : t('admin.users.apiKeys.feedback.createdOne'),
        color: 'success'
      })
      secretModal.open({ keys: res.keys })
    }
    formOpen.value = false
    editingId.value = null
    resetForm()
  } catch (err) {
    toast.add({
      title: parseFetchError(
        err,
        editingId.value ? t('common.feedback.updateFailed') : t('common.feedback.createFailed')
      ),
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function openReset(key: ApiKeyItem) {
  resetModal.open({ target: key, onReset: resetKey })
}

async function toggleActive(key: ApiKeyItem) {
  try {
    await updateKey(key.id, { isActive: !key.isActive })
    toast.add({
      title: key.isActive
        ? t('common.apiKeys.feedback.disabled')
        : t('common.apiKeys.feedback.enabled'),
      color: 'success'
    })
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  }
}

async function removeKeyAction(id: number) {
  try {
    await removeKey(id)
    toast.add({ title: t('common.feedback.deleted'), color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="$t('admin.users.apiKeys.title', { username: target?.username ?? '' })"
    :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
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
          {{ formOpen ? $t('admin.users.apiKeys.actions.collapse') : $t('admin.users.apiKeys.actions.add') }}
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
          {{ $t('admin.users.apiKeys.editingHint', { id: editingId }) }}
        </div>

        <ApiKeyFormFields
          v-model="form"
          :scope-select-items="scopeSelectItems"
          :ip-line-errors="ipLineErrors"
          :error="formError"
          :show-count="!editingId"
          :editing="!!editingId"
          size="sm"
        />

        <div class="flex justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            @click="() => { formOpen = false }"
          >
            {{ $t('common.actions.cancel') }}
          </UButton>
          <UButton
            size="sm"
            :loading="creating"
            :disabled="!!formError"
            @click="submitForm"
          >
            {{ editingId ? $t('common.actions.save') : $t('admin.users.apiKeys.actions.generate') }}
          </UButton>
        </div>
      </div>

      <div
        v-if="loading"
        class="text-sm text-muted py-4 text-center"
      >
        {{ $t('common.states.loading') }}
      </div>
      <div
        v-else-if="keys.length === 0"
        class="text-sm text-muted py-4 text-center"
      >
        {{ $t('admin.users.apiKeys.empty') }}
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
                  v-if="getStatus(key).code !== 'enabled'"
                  :color="getStatus(key).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatus(key).label }}
                </UBadge>
              </div>
              <div class="flex items-center gap-1">
                <code class="font-mono text-xs px-2 py-1 rounded bg-elevated truncate">
                  {{ key.keyPreview }}
                </code>
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="openEditForm(key)"
              >
                {{ $t('common.actions.edit') }}
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="toggleActive(key)"
              >
                {{ key.isActive ? $t('common.apiKeys.actions.disable') : $t('common.apiKeys.actions.enable') }}
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="openReset(key)"
              >
                {{ $t('common.apiKeys.actions.reset') }}
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="error"
                @click="removeKeyAction(key.id)"
              >
                {{ $t('common.actions.delete') }}
              </UButton>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
            <div>{{ $t('admin.users.apiKeys.summary.expiry') }}：{{ formatDateTime(key.expiresAt, $t('common.apiKeys.expiry.never'), locale) }}</div>
            <div>{{ $t('admin.users.apiKeys.summary.quota') }}：{{ getQuotaText(key) }}</div>
            <div>{{ $t('admin.users.apiKeys.summary.scopes') }}：{{ getScopesText(key.scopes, scopeLabelMap) }}</div>
            <div>{{ $t('admin.users.apiKeys.summary.ip') }}：{{ getIpText(key.ipWhitelist) }}</div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
