<script setup lang="ts">
import {
  API_CAPABILITY_CONTROL,
  type AdminApiCapabilityResponse
} from '#shared/types/api-capability'
import type { DiscoveredApi } from '#shared/types/api'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ target: DiscoveredApi | null }>()
const toast = useToast()
const { t } = useI18n()

const response = ref<AdminApiCapabilityResponse | null>(null)
const values = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref('')
let requestSequence = 0

const modalTitle = computed(() => {
  if (!props.target) return t('admin.apis.capabilities.modal.title')
  return t('admin.apis.capabilities.modal.titleWithTarget', {
    version: props.target.pathVersion,
    code: props.target.code
  })
})

function cloneValues(source: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(source)
}

function setValue(key: string, value: boolean | string | string[] | number): void {
  values.value = { ...values.value, [key]: value }
}

function getBooleanValue(key: string): boolean {
  return values.value[key] === true
}

function getStringValue(key: string): string {
  return typeof values.value[key] === 'string' ? values.value[key] : ''
}

function getStringArrayValue(key: string): string[] {
  const value = values.value[key]
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
}

function getNumberValue(key: string): number {
  return typeof values.value[key] === 'number' ? values.value[key] : 0
}

function closeModal(): void {
  open.value = false
}

async function loadCapabilities(): Promise<void> {
  const target = props.target
  if (!open.value || !target) return

  const currentRequest = ++requestSequence
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await $fetch<AdminApiCapabilityResponse>('/api/admin/apis/capabilities', {
      query: { pathVersion: target.pathVersion, code: target.code }
    })
    if (currentRequest !== requestSequence) return
    response.value = data
    values.value = cloneValues(data.config.values)
  } catch (error) {
    if (currentRequest !== requestSequence) return
    response.value = null
    loadError.value = parseFetchError(error, t('admin.apis.capabilities.feedback.loadFailed'))
  } finally {
    if (currentRequest === requestSequence) isLoading.value = false
  }
}

async function saveCapabilities(): Promise<void> {
  const target = props.target
  const current = response.value
  if (!target || !current) return

  isSaving.value = true
  try {
    const config = await $fetch<AdminApiCapabilityResponse['config']>('/api/admin/apis/capabilities', {
      method: 'PUT',
      body: {
        pathVersion: target.pathVersion,
        code: target.code,
        revision: current.config.revision,
        values: values.value
      }
    })
    response.value = { ...current, config }
    values.value = cloneValues(config.values)
    toast.add({ title: t('admin.apis.capabilities.feedback.saved'), color: 'success' })
    open.value = false
  } catch (error) {
    toast.add({
      title: parseFetchError(error, t('admin.apis.capabilities.feedback.saveFailed')),
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

watch(
  () => [open.value, props.target?.pathVersion, props.target?.code] as const,
  ([isOpen]) => {
    if (!isOpen) {
      requestSequence += 1
      response.value = null
      values.value = {}
      loadError.value = ''
      return
    }
    void loadCapabilities()
  },
  { immediate: true }
)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="response?.definition.description"
    :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
  >
    <template #body>
      <div v-if="isLoading" class="space-y-3">
        <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
      </div>

      <div v-else-if="loadError" class="rounded-xl border border-error/30 bg-error/5 p-4">
        <p class="text-sm text-error">
          {{ loadError }}
        </p>
        <UButton
          class="mt-3"
          color="error"
          variant="soft"
          icon="i-lucide-refresh-cw"
          @click="loadCapabilities"
        >
          {{ t('admin.apis.capabilities.actions.reload') }}
        </UButton>
      </div>

      <div v-else-if="response" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="subtle">
            {{ response.config.isConfigured
              ? t('admin.apis.capabilities.status.configuredRevision', { revision: response.config.revision })
              : t('admin.apis.capabilities.status.declarationDefault') }}
          </UBadge>
          <span class="text-xs text-muted">
            {{ t('admin.apis.capabilities.status.sharedStorage') }}
          </span>
        </div>

        <UFormField
          v-for="field in response.definition.fields"
          :key="field.key"
          :label="field.label"
          :description="field.description"
          class="rounded-xl border border-default bg-elevated/30 p-4"
        >
          <USwitch
            v-if="field.control === API_CAPABILITY_CONTROL.boolean"
            :model-value="getBooleanValue(field.key)"
            @update:model-value="value => setValue(field.key, value)"
          />

          <URadioGroup
            v-else-if="field.control === API_CAPABILITY_CONTROL.singleSelect"
            :model-value="getStringValue(field.key)"
            :items="field.options"
            variant="card"
            @update:model-value="value => setValue(field.key, value)"
          />

          <UCheckboxGroup
            v-else-if="field.control === API_CAPABILITY_CONTROL.multiSelect"
            :model-value="getStringArrayValue(field.key)"
            :items="field.options"
            variant="card"
            @update:model-value="value => setValue(field.key, value)"
          />

          <UInput
            v-else-if="field.control === API_CAPABILITY_CONTROL.text"
            class="w-full"
            :type="field.isSecret ? 'password' : 'text'"
            :model-value="getStringValue(field.key)"
            :placeholder="field.isSecret && response.config.configuredSecretKeys?.includes(field.key)
              ? t('admin.apis.capabilities.form.configuredSecretPlaceholder')
              : field.placeholder"
            :minlength="field.minLength"
            :maxlength="field.maxLength"
            @update:model-value="value => setValue(field.key, value)"
          />

          <UTextarea
            v-else-if="field.control === API_CAPABILITY_CONTROL.textarea"
            class="w-full"
            autoresize
            :rows="field.rows ?? 4"
            :model-value="getStringValue(field.key)"
            :placeholder="field.placeholder"
            :minlength="field.minLength"
            :maxlength="field.maxLength"
            @update:model-value="value => setValue(field.key, value)"
          />

          <UInputNumber
            v-else
            class="w-full"
            :model-value="getNumberValue(field.key)"
            :placeholder="field.placeholder"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @update:model-value="value => setValue(field.key, value)"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="closeModal">
          {{ t('common.actions.cancel') }}
        </UButton>
        <UButton :loading="isSaving" :disabled="isLoading || !response" @click="saveCapabilities">
          {{ t('admin.apis.capabilities.actions.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
