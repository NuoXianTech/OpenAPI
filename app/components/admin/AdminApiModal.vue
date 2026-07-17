<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { AdminApiFormState, DiscoveredApi, RegisteredApi } from '#shared/types/api'
import { API_STATUS } from '#shared/config/api-status'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { provideAdminApiForm } from '~/composables/admin/use-admin-api-form'
import {
  compactFormErrors,
  integerRangeError,
  maxLengthError,
  requiredTextError
} from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  mode: 'register' | 'edit'
  target: DiscoveredApi | null
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const form = useTemplateRef('form')
const { t, locale } = useI18n()

function validateApiForm(state: Partial<AdminApiFormState>): FormError<string>[] {
  const methodCostsAreValid = Object.values(state.methodCosts ?? {})
    .every(value => Number.isInteger(value) && value >= 0)

  return compactFormErrors(
    requiredTextError('name', state.name, t('admin.apis.form.validation.nameRequired')),
    maxLengthError('name', state.name, 100, t('admin.apis.form.validation.nameMaxLength')),
    requiredTextError('shortDesc', state.shortDesc, t('admin.apis.form.validation.shortDescriptionRequired')),
    maxLengthError('shortDesc', state.shortDesc, 50, t('admin.apis.form.validation.shortDescriptionMaxLength')),
    requiredTextError('description', state.description, t('admin.apis.form.validation.descriptionRequired')),
    integerRangeError('rateLimitPerSecond', state.rateLimitPerSecond, t('admin.apis.form.validation.perSecond'), 0),
    integerRangeError('rateLimitPerMinute', state.rateLimitPerMinute, t('admin.apis.form.validation.perMinute'), 0),
    integerRangeError('rateLimitPerHour', state.rateLimitPerHour, t('admin.apis.form.validation.perHour'), 0),
    integerRangeError('rateLimitPerDay', state.rateLimitPerDay, t('admin.apis.form.validation.perDay'), 0),
    integerRangeError('dailyQuota', state.dailyQuota, t('admin.apis.form.validation.dailyQuota'), 0),
    integerRangeError('timeoutMs', state.timeoutMs, t('admin.apis.form.validation.timeout'), 100, 120_000),
    !methodCostsAreValid && { name: 'methodCosts', message: t('admin.apis.form.validation.methodCosts') }
  )
}

function defaultsForRegister(target: DiscoveredApi): AdminApiFormState {
  return {
    name: target.code,
    shortDesc: `${target.pathVersion} ${target.code}`,
    description: t('admin.apis.form.modal.defaultDescription', {
      version: target.pathVersion,
      code: target.code
    }),
    docUrl: '',
    status: API_STATUS.automatic,
    categoryId: null,
    isEnabled: false,
    isApiKey: false,
    isStatistics: false,
    rateLimitPerSecond: 0,
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 0,
    dailyQuota: 0,
    methodCosts: {},
    timeoutMs: 10_000
  }
}

function defaultsForEdit(reg: RegisteredApi): AdminApiFormState {
  return {
    name: reg.name,
    shortDesc: reg.shortDesc,
    description: reg.description,
    docUrl: reg.docUrl,
    status: reg.status,
    categoryId: reg.categoryId,
    isEnabled: reg.isEnabled,
    isApiKey: reg.isApiKey,
    isStatistics: reg.isStatistics,
    rateLimitPerSecond: reg.rateLimitPerSecond,
    rateLimitPerMinute: reg.rateLimitPerMinute,
    rateLimitPerHour: reg.rateLimitPerHour,
    rateLimitPerDay: reg.rateLimitPerDay,
    dailyQuota: reg.dailyQuota,
    methodCosts: { ...(reg.methodCosts || {}) },
    timeoutMs: reg.timeoutMs
  }
}

const state = reactive<AdminApiFormState>(defaultsForRegister({
  code: '',
  pathVersion: '',
  endpointCount: 0,
  endpoints: [],
  registered: null,
  orphaned: false,
  hasCapabilities: false
}))
const loading = ref(false)

provideAdminApiForm(state)

watch(() => [props.target, props.mode, open.value], () => {
  if (!open.value || !props.target) return
  const next = props.mode === 'edit' && props.target.registered
    ? defaultsForEdit(props.target.registered)
    : defaultsForRegister(props.target)
  Object.assign(state, next)
}, { immediate: true })

// 同 code 下从 manifest 自动发现的方法（去重，排除 ANY）。
// 计费表按这些方法逐行展示；ANY 端点视为对所有 HTTP 方法生效，由用户在已列出的方法上分别填价。
const availableMethods = computed<string[]>(() => {
  if (!props.target) return []
  const set = new Set<string>()
  for (const ep of props.target.endpoints) {
    const m = ep.method.toUpperCase()
    if (m && m !== 'ANY') set.add(m)
  }
  if (set.size === 0) set.add('GET')
  return Array.from(set).sort()
})

const hasChargedMethod = computed(() => {
  const map = state.methodCosts || {}
  return Object.values(map).some(v => typeof v === 'number' && v > 0)
})

// 计费与 ApiKey 强一致：关闭 ApiKey 时清空 methodCosts；任意方法填了 > 0 则自动开启 isApiKey
watch(() => state.isApiKey, (val) => {
  if (!val && hasChargedMethod.value) {
    state.methodCosts = {}
  }
})
watch(hasChargedMethod, (val) => {
  if (val && !state.isApiKey) {
    state.isApiKey = true
    toast.add({
      title: t('admin.apis.form.feedback.apiKeyAutoEnabled'),
      description: t('admin.apis.form.feedback.apiKeyAutoEnabledDescription'),
      color: 'info'
    })
  }
})

// 统计依赖接口可用：关闭接口时同步关闭统计；未启用接口时不允许单独开启统计。
watch(() => state.isEnabled, (val) => {
  if (!val && state.isStatistics) {
    state.isStatistics = false
  }
})
watch(() => state.isStatistics, (val) => {
  if (val && !state.isEnabled) {
    state.isStatistics = false
  }
})

const headerLabel = computed(() => {
  if (!props.target) return ''
  return props.mode === 'edit'
    ? t('admin.apis.form.modal.editTitle', {
        version: props.target.pathVersion,
        code: props.target.code
      })
    : t('admin.apis.form.modal.registerTitle', {
        version: props.target.pathVersion,
        code: props.target.code
      })
})
const endpointDescription = computed(() => props.target
  ? t('admin.apis.form.modal.endpointCount', {
      count: props.target.endpointCount.toLocaleString(locale.value)
    })
  : undefined)

async function onSubmit(event: FormSubmitEvent<AdminApiFormState>) {
  if (!props.target) return
  loading.value = true
  try {
    const cleanedCosts: Record<string, number> = {}
    for (const [k, v] of Object.entries(event.data.methodCosts || {})) {
      const num = Number(v)
      if (Number.isFinite(num) && num > 0) cleanedCosts[k.toUpperCase()] = Math.trunc(num)
    }
    const payload = { ...event.data, methodCosts: cleanedCosts }
    if (props.mode === 'edit' && props.target.registered) {
      await $fetch('/api/admin/apis/update', {
        method: 'PUT',
        body: { id: props.target.registered.id, ...payload }
      })
    } else {
      await $fetch('/api/admin/apis/register', {
        method: 'POST',
        body: {
          pathVersion: props.target.pathVersion,
          code: props.target.code,
          overrides: payload
        }
      })
    }
    toast.add({
      title: props.mode === 'edit'
        ? t('admin.apis.form.feedback.updated')
        : t('admin.apis.form.feedback.registered'),
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="headerLabel"
    :description="endpointDescription"
    :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
  >
    <template #body>
      <AdminApiEndpointPreview
        v-if="target"
        :endpoints="target.endpoints"
      />

      <UForm
        ref="form"
        :validate="validateApiForm"
        :state="state"
        class="grid gap-4 lg:grid-cols-2"
        @submit="onSubmit"
      >
        <AdminApiBasicForm />
        <AdminApiAccessControlForm
          :has-charged-method="hasChargedMethod"
        />
        <AdminApiRateLimitForm />
        <AdminApiMethodCostsForm
          :available-methods="availableMethods"
          :has-charged-method="hasChargedMethod"
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="() => { open = false }"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :loading="loading"
          @click="() => { form?.submit() }"
        >
          {{ mode === 'edit' ? $t('common.actions.save') : $t('admin.apis.form.actions.register') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
