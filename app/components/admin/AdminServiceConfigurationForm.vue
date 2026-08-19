<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type {
  ServiceConfigurationField,
  ServiceConfigurationValue,
  ServiceConfigurationView
} from '#shared/types/service-control'

const props = defineProps<{
  view: ServiceConfigurationView
  loading?: boolean
}>()
const emit = defineEmits<{
  submit: [payload: {
    expectedRevision: number
    values: Record<string, ServiceConfigurationValue>
    secrets: Record<string, string | null>
  }]
}>()
const { t } = useI18n()

const formState = reactive({ ready: true })
const values = reactive<Record<string, ServiceConfigurationValue>>({})
const secretValues = reactive<Record<string, string>>({})
const secretDirty = reactive<Record<string, boolean>>({})
const secretCleared = reactive<Record<string, boolean>>({})

const definition = computed(() => props.view.definition)

function cloneConfigurationValue(
  value: ServiceConfigurationValue
): ServiceConfigurationValue {
  return Array.isArray(value) ? [...value] : value
}

function clearRecord(record: Record<string, unknown>) {
  for (const key of Object.keys(record)) {
    Reflect.deleteProperty(record, key)
  }
}

watch(
  () => props.view,
  (view) => {
    clearRecord(values)
    clearRecord(secretValues)
    clearRecord(secretDirty)
    clearRecord(secretCleared)

    for (const group of view.definition?.groups ?? []) {
      for (const field of group.fields) {
        if (field.type === 'secret') {
          secretValues[field.key] = ''
          secretDirty[field.key] = false
          secretCleared[field.key] = false
          continue
        }
        const current = view.values[field.key]
        values[field.key] = isConfigurationValue(current)
          ? cloneConfigurationValue(current)
          : cloneConfigurationValue(field.default)
      }
    }
  },
  { immediate: true, deep: true }
)

function isConfigurationValue(
  value: unknown
): value is ServiceConfigurationValue {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || (Array.isArray(value) && value.every(item => typeof item === 'string'))
}

function secretConfigured(key: string): boolean {
  const value = props.view.values[key]
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && 'configured' in value
    && value.configured
  )
}

function booleanValue(key: string): boolean {
  return values[key] === true
}

function numberValue(key: string): number {
  return typeof values[key] === 'number' ? values[key] : 0
}

function stringValue(key: string): string {
  return typeof values[key] === 'string' ? values[key] : ''
}

function stringArrayValue(key: string): string[] {
  return Array.isArray(values[key]) ? values[key] as string[] : []
}

function setValue(key: string, value: ServiceConfigurationValue) {
  values[key] = value
}

function setSecret(key: string, value: string) {
  secretValues[key] = value
  secretDirty[key] = true
  secretCleared[key] = false
}

function clearSecret(key: string) {
  secretValues[key] = ''
  secretDirty[key] = true
  secretCleared[key] = true
}

function keepSecret(key: string) {
  secretValues[key] = ''
  secretDirty[key] = false
  secretCleared[key] = false
}

function validate(): FormError<string>[] {
  const errors: FormError<string>[] = []
  for (const group of definition.value?.groups ?? []) {
    for (const field of group.fields) {
      const error = validateField(field)
      if (error) errors.push({ name: field.key, message: error })
    }
  }
  return errors
}

function validateField(field: ServiceConfigurationField): string | null {
  if (field.type === 'secret') {
    const value = secretValues[field.key] ?? ''
    const preserved = secretConfigured(field.key) && !secretDirty[field.key]
    if (field.required && !preserved && (!value || secretCleared[field.key])) {
      return t('admin.apis.routing.serviceControl.validation.required')
    }
    if (value && field.minLength !== undefined && value.length < field.minLength) {
      return t('admin.apis.routing.serviceControl.validation.minLength', {
        count: field.minLength
      })
    }
    if (value && field.maxLength !== undefined && value.length > field.maxLength) {
      return t('admin.apis.routing.serviceControl.validation.maxLength', {
        count: field.maxLength
      })
    }
    return null
  }

  const value = values[field.key]
  if ((field.type === 'text' || field.type === 'textarea')) {
    if (typeof value !== 'string') {
      return t('admin.apis.routing.serviceControl.validation.invalid')
    }
    if (field.required && !value) {
      return t('admin.apis.routing.serviceControl.validation.required')
    }
    if (field.minLength !== undefined && value.length < field.minLength) {
      return t('admin.apis.routing.serviceControl.validation.minLength', {
        count: field.minLength
      })
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return t('admin.apis.routing.serviceControl.validation.maxLength', {
        count: field.maxLength
      })
    }
  }
  if (
    field.type === 'number'
    && (typeof value !== 'number' || !Number.isFinite(value))
  ) return t('admin.apis.routing.serviceControl.validation.invalid')
  if (
    field.type === 'multi-select'
    && field.required
    && (!Array.isArray(value) || value.length === 0)
  ) return t('admin.apis.routing.serviceControl.validation.required')
  return null
}

function onSubmit() {
  const secrets: Record<string, string | null> = {}
  for (const [key, dirty] of Object.entries(secretDirty)) {
    if (!dirty) continue
    secrets[key] = secretCleared[key] ? null : secretValues[key] ?? ''
  }
  emit('submit', {
    expectedRevision: props.view.connection.configurationRevision,
    values: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        cloneConfigurationValue(value)
      ])
    ),
    secrets
  })
}
</script>

<template>
  <UForm
    :state="formState"
    :validate="validate"
    class="space-y-4"
    @submit="onSubmit"
  >
    <div class="overflow-hidden rounded-lg border border-default bg-default">
      <section
        v-for="group in definition?.groups ?? []"
        :key="group.key"
        class="grid border-b border-default last:border-b-0 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]"
      >
        <header class="bg-elevated/40 p-4 sm:p-5 lg:bg-transparent lg:p-6">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ group.label }}
          </h3>
          <p
            v-if="group.description"
            class="mt-1.5 max-w-prose text-xs leading-5 text-muted"
          >
            {{ group.description }}
          </p>
        </header>

        <div class="divide-y divide-default px-4 sm:px-5 lg:pe-6 lg:ps-0">
          <UFormField
            v-for="field in group.fields"
            :key="field.key"
            :name="field.key"
            :label="field.label"
            :description="field.description"
            :required="field.required"
            class="py-5 md:grid md:grid-cols-[minmax(11rem,16rem)_minmax(0,1fr)] md:items-start md:gap-6"
            :ui="{ container: 'mt-2 min-w-0 md:mt-0' }"
          >
            <USwitch
              v-if="field.type === 'boolean'"
              :model-value="booleanValue(field.key)"
              @update:model-value="setValue(field.key, $event)"
            />
            <UInputNumber
              v-else-if="field.type === 'number'"
              :model-value="numberValue(field.key)"
              :min="field.minimum"
              :max="field.maximum"
              :step="field.step"
              class="w-full sm:max-w-xs"
              @update:model-value="setValue(field.key, $event ?? field.default)"
            />
            <USelect
              v-else-if="field.type === 'single-select'"
              :model-value="stringValue(field.key)"
              :items="field.options"
              value-key="value"
              class="w-full"
              @update:model-value="setValue(field.key, $event)"
            />
            <USelectMenu
              v-else-if="field.type === 'multi-select'"
              :model-value="stringArrayValue(field.key)"
              :items="field.options"
              value-key="value"
              multiple
              class="w-full"
              @update:model-value="setValue(field.key, $event)"
            />
            <UTextarea
              v-else-if="field.type === 'textarea'"
              :model-value="stringValue(field.key)"
              :placeholder="field.placeholder"
              autoresize
              :rows="3"
              :maxrows="10"
              class="w-full"
              @update:model-value="setValue(field.key, $event)"
            />
            <div v-else-if="field.type === 'secret'" class="space-y-2">
              <div class="flex min-w-0 items-center gap-2">
                <UInput
                  :model-value="secretValues[field.key]"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="secretConfigured(field.key) && !secretDirty[field.key]
                    ? $t('admin.apis.routing.serviceControl.secretConfiguredPlaceholder')
                    : field.placeholder"
                  class="min-w-0 flex-1 font-mono"
                  @update:model-value="setSecret(field.key, $event)"
                />
                <UTooltip
                  v-if="secretConfigured(field.key) && !secretCleared[field.key]"
                  :text="$t('admin.apis.routing.serviceControl.clearSecret')"
                >
                  <UButton
                    color="error"
                    variant="ghost"
                    size="sm"
                    square
                    type="button"
                    icon="i-lucide-trash-2"
                    :aria-label="$t('admin.apis.routing.serviceControl.clearSecret')"
                    @click="clearSecret(field.key)"
                  />
                </UTooltip>
                <UTooltip
                  v-if="secretDirty[field.key]"
                  :text="$t('admin.apis.routing.serviceControl.keepSecret')"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    type="button"
                    icon="i-lucide-undo-2"
                    :aria-label="$t('admin.apis.routing.serviceControl.keepSecret')"
                    @click="keepSecret(field.key)"
                  />
                </UTooltip>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :color="secretConfigured(field.key) && !secretCleared[field.key]
                    ? 'success'
                    : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ secretConfigured(field.key) && !secretCleared[field.key]
                    ? $t('admin.apis.routing.serviceControl.secretConfigured')
                    : $t('admin.apis.routing.serviceControl.secretNotConfigured') }}
                </UBadge>
              </div>
            </div>
            <UInput
              v-else
              :model-value="stringValue(field.key)"
              :placeholder="field.placeholder"
              class="w-full"
              @update:model-value="setValue(field.key, $event)"
            />
          </UFormField>
        </div>
      </section>
    </div>

    <div class="sticky bottom-0 z-10 flex justify-end border-t border-default bg-default/95 py-4 backdrop-blur-sm">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="loading"
      >
        {{ $t('admin.apis.routing.serviceControl.saveConfiguration') }}
      </UButton>
    </div>
  </UForm>
</template>
