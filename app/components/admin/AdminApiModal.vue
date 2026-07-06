<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminApiFormState, DiscoveredApi, RegisteredApi } from '#shared/types/api'
import { API_STATUS } from '#shared/config/api-status'
import { parseFetchError } from '~/utils/client-error'
import { requiredString } from '#shared/schemas/validation'
import { provideAdminApiForm } from '~/composables/admin/use-admin-api-form'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  mode: 'register' | 'edit'
  target: DiscoveredApi | null
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const form = useTemplateRef('form')

const schema = z.object({
  name: requiredString('接口名称', { max: 100 }),
  shortDesc: requiredString('接口短描述', { max: 50 }),
  description: requiredString('接口描述'),
  docUrl: z.string().default(''),
  status: z.number().default(API_STATUS.automatic),
  categoryId: z.number().nullable().optional(),
  isEnabled: z.boolean().default(false),
  isApiKey: z.boolean().default(false),
  isStatistics: z.boolean().default(false),
  rateLimitPerSecond: z.number().min(0).default(0),
  rateLimitPerMinute: z.number().min(0).default(60),
  rateLimitPerHour: z.number().min(0).default(1000),
  rateLimitPerDay: z.number().min(0).default(0),
  dailyQuota: z.number().min(0).default(0),
  methodCosts: z.record(z.string(), z.number().int().min(0)).default({}),
  timeoutMs: z.number().min(0).default(10_000)
})

type Schema = z.output<typeof schema>

function defaultsForRegister(target: DiscoveredApi): AdminApiFormState {
  return {
    name: target.code,
    shortDesc: `${target.pathVersion} ${target.code}`,
    description: `${target.pathVersion} ${target.code} 接口`,
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

const state = reactive<AdminApiFormState>(defaultsForRegister({ code: '', pathVersion: '', endpointCount: 0, endpoints: [], registered: null, orphaned: false }))
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
      title: '已自动开启「必需 API Key」',
      description: '设置扣费后必须通过 API Key 鉴权扣款账户。',
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
    ? `编辑配置：${props.target.pathVersion} / ${props.target.code}`
    : `登记接口：${props.target.pathVersion} / ${props.target.code}`
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
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
      title: props.mode === 'edit' ? '更新成功' : '登记成功',
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="headerLabel"
    :description="target ? `${target.endpointCount} 端点` : undefined"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <AdminApiEndpointPreview
        v-if="target"
        :endpoints="target.endpoints"
      />

      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="space-y-3"
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
          取消
        </UButton>
        <UButton
          :loading="loading"
          @click="() => { form?.submit() }"
        >
          {{ mode === 'edit' ? '保存' : '登记' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
