<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

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

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  mode: 'register' | 'edit'
  target: DiscoveredApi | null
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const schema = z.object({
  name: z.string().min(1, '必填').max(100),
  shortDesc: z.string().min(1, '必填').max(30, '最多30字'),
  description: z.string().min(1, '必填'),
  docUrl: z.string().default(''),
  status: z.number().default(-1),
  categoryId: z.number().nullable().optional(),
  isEnabled: z.boolean().default(false),
  isApiKey: z.boolean().default(false),
  isStatistics: z.boolean().default(false),
  rateLimitPerSecond: z.number().min(0).default(0),
  rateLimitPerMinute: z.number().min(0).default(60),
  rateLimitPerHour: z.number().min(0).default(1000),
  rateLimitPerDay: z.number().min(0).default(0),
  dailyQuota: z.number().min(0).default(0),
  costCredits: z.number().min(0).default(0),
  timeoutMs: z.number().min(0).default(10_000),
})

type Schema = z.output<typeof schema>

function defaultsForRegister(target: DiscoveredApi): Partial<Schema> {
  return {
    name: target.code,
    shortDesc: `${target.pathVersion} ${target.code}`,
    description: `自动登记于 ${target.sourceDir}`,
    docUrl: '',
    status: -1,
    categoryId: null,
    isEnabled: false,
    isApiKey: false,
    isStatistics: false,
    rateLimitPerSecond: 0,
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 0,
    dailyQuota: 0,
    costCredits: 0,
    timeoutMs: 10_000,
  }
}

function defaultsForEdit(reg: RegisteredApi): Partial<Schema> {
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
    costCredits: reg.costCredits,
    timeoutMs: reg.timeoutMs,
  }
}

const state = reactive<Partial<Schema>>({})
const loading = ref(false)

const { data: categoriesData, refresh: refreshCategories } = useLazyFetch('/api/admin/api-categories/list', {
  default: () => ({ code: 0, msg: '', data: [] as Array<{ id: number, name: string, code: string }> }),
})
const categoryOptions = computed(() => [
  { label: '未分类', value: null },
  ...((categoriesData.value?.data || []).map(c => ({ label: c.name, value: c.id }))),
])

// 内联新增分类
const showAddCategory = ref(false)
const newCategoryCode = ref('')
const newCategoryName = ref('')
const addingCategory = ref(false)

async function submitAddCategory() {
  const code = newCategoryCode.value.trim()
  const name = newCategoryName.value.trim()
  if (!code || !name) {
    toast.add({ title: 'code 与名称均必填', color: 'warning' })
    return
  }
  addingCategory.value = true
  try {
    const res = await $fetch<{ id?: number }>('/api/admin/api-categories/add', {
      method: 'POST',
      body: { code, name, isEnabled: true },
    })
    await refreshCategories()
    if (res?.id) state.categoryId = res.id
    showAddCategory.value = false
    newCategoryCode.value = ''
    newCategoryName.value = ''
    toast.add({ title: '已新增分类', color: 'success' })
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '新增失败', color: 'error' })
  }
  finally {
    addingCategory.value = false
  }
}

watch(() => [props.target, props.mode, open.value], () => {
  if (!open.value || !props.target) return
  const next = props.mode === 'edit' && props.target.registered
    ? defaultsForEdit(props.target.registered)
    : defaultsForRegister(props.target)
  Object.assign(state, next)
}, { immediate: true })

// 计费与 ApiKey 强一致：关闭 ApiKey 必需时，自动把 costCredits 归 0
// 反之，若管理员把 costCredits 设为 > 0，自动开启 isApiKey 并提示
watch(() => state.isApiKey, (val) => {
  if (!val && (state.costCredits ?? 0) > 0) {
    state.costCredits = 0
  }
})
watch(() => state.costCredits, (val) => {
  if ((val ?? 0) > 0 && !state.isApiKey) {
    state.isApiKey = true
    toast.add({
      title: '已自动开启「必需 API Key」',
      description: '设置扣费后必须通过 API Key 鉴权扣款账户。',
      color: 'info',
    })
  }
})

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '未知', value: -1 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 },
]

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
    if (props.mode === 'edit' && props.target.registered) {
      await $fetch('/api/admin/apis/update', {
        method: 'PUT',
        body: { id: props.target.registered.id, ...event.data },
      })
    }
    else {
      await $fetch('/api/admin/apis/register', {
        method: 'POST',
        body: {
          pathVersion: props.target.pathVersion,
          code: props.target.code,
          overrides: event.data,
        },
      })
    }
    toast.add({
      title: props.mode === 'edit' ? '更新成功' : '登记成功',
      color: 'success',
    })
    open.value = false
    emit('saved')
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '操作失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-1">
          {{ headerLabel }}
        </h3>
        <p
          v-if="target"
          class="text-xs text-muted mb-4 font-mono"
        >
          {{ target.sourceDir }} · {{ target.endpointCount }} 端点
        </p>

        <div
          v-if="target?.endpoints.length"
          class="mb-4 rounded-lg border border-default p-3 bg-elevated/30"
        >
          <div class="text-xs text-muted mb-2">
            发现的端点（路径与方法不可编辑，由文件结构决定）
          </div>
          <div class="flex flex-col gap-1">
            <div
              v-for="ep in target.endpoints"
              :key="`${ep.method}-${ep.apiPath}`"
              class="flex items-center gap-2 text-sm"
            >
              <UBadge
                variant="subtle"
                class="font-mono"
              >
                {{ ep.method }}
              </UBadge>
              <span class="font-mono">{{ ep.apiPath }}</span>
              <span
                v-if="ep.isDynamic"
                class="text-xs text-primary"
              >动态</span>
            </div>
          </div>
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-3"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="名称"
              name="name"
            >
              <UInput
                v-model="state.name"
                placeholder="对外展示名称"
              />
            </UFormField>
            <UFormField
              label="状态"
              name="status"
            >
              <USelect
                v-model="state.status"
                :items="statusOptions"
              />
            </UFormField>
          </div>
          <UFormField
            label="简短描述"
            name="shortDesc"
          >
            <UInput
              v-model="state.shortDesc"
              placeholder="最多30字"
            />
          </UFormField>
          <UFormField
            label="详细描述"
            name="description"
          >
            <UTextarea
              v-model="state.description"
              :rows="3"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="文档地址"
              name="docUrl"
            >
              <UInput
                v-model="state.docUrl"
                placeholder="https://docs.example.com"
              />
            </UFormField>
            <UFormField
              label="分类"
              name="categoryId"
            >
              <div class="flex gap-2">
                <USelect
                  v-model="state.categoryId"
                  :items="categoryOptions"
                  class="flex-1"
                />
                <UButton
                  icon="i-mdi-plus"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  type="button"
                  @click="showAddCategory = !showAddCategory"
                />
              </div>
              <div
                v-if="showAddCategory"
                class="mt-2 p-2 rounded-md border border-default bg-elevated/30 flex flex-col gap-2"
              >
                <div class="grid grid-cols-2 gap-2">
                  <UInput
                    v-model="newCategoryCode"
                    placeholder="code（如：weather）"
                    size="sm"
                  />
                  <UInput
                    v-model="newCategoryName"
                    placeholder="名称（如：天气类）"
                    size="sm"
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    type="button"
                    @click="showAddCategory = false"
                  >
                    取消
                  </UButton>
                  <UButton
                    size="xs"
                    :loading="addingCategory"
                    type="button"
                    @click="submitAddCategory"
                  >
                    新增
                  </UButton>
                </div>
              </div>
            </UFormField>
          </div>

          <div class="border-t border-default pt-3 mt-3">
            <div class="text-sm font-medium mb-2">
              访问控制
            </div>
            <div class="flex flex-wrap gap-6">
              <USwitch
                v-model="state.isEnabled"
                label="启用接口"
              />
              <USwitch
                v-model="state.isApiKey"
                label="必需 API Key"
              />
              <USwitch
                v-model="state.isStatistics"
                label="统计调用"
              />
            </div>
            <p
              v-if="!state.isApiKey && (state.costCredits ?? 0) > 0"
              class="text-xs text-warning mt-2"
            >
              关闭「必需 API Key」会同时把扣费金额归 0（无法定位扣款账户）。
            </p>
          </div>

          <div class="border-t border-default pt-3 mt-3">
            <div class="text-sm font-medium mb-2">
              限流（0 = 不限）
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField
                label="每秒"
                name="rateLimitPerSecond"
              >
                <UInput
                  v-model.number="state.rateLimitPerSecond"
                  type="number"
                  min="0"
                />
              </UFormField>
              <UFormField
                label="每分钟"
                name="rateLimitPerMinute"
              >
                <UInput
                  v-model.number="state.rateLimitPerMinute"
                  type="number"
                  min="0"
                />
              </UFormField>
              <UFormField
                label="每小时"
                name="rateLimitPerHour"
              >
                <UInput
                  v-model.number="state.rateLimitPerHour"
                  type="number"
                  min="0"
                />
              </UFormField>
              <UFormField
                label="每天"
                name="rateLimitPerDay"
              >
                <UInput
                  v-model.number="state.rateLimitPerDay"
                  type="number"
                  min="0"
                />
              </UFormField>
              <UFormField
                label="日配额"
                name="dailyQuota"
              >
                <UInput
                  v-model.number="state.dailyQuota"
                  type="number"
                  min="0"
                />
              </UFormField>
              <UFormField
                label="超时(ms)"
                name="timeoutMs"
              >
                <UInput
                  v-model.number="state.timeoutMs"
                  type="number"
                  min="0"
                />
              </UFormField>
            </div>
          </div>

          <div class="border-t border-default pt-3 mt-3">
            <div class="text-sm font-medium mb-2 flex items-center gap-2">
              <span>计费</span>
              <UBadge
                v-if="!state.isApiKey"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                需先开启「必需 API Key」
              </UBadge>
              <UBadge
                v-else-if="(state.costCredits ?? 0) > 0"
                color="warning"
                variant="subtle"
                size="sm"
              >
                收费接口
              </UBadge>
              <UBadge
                v-else
                color="success"
                variant="subtle"
                size="sm"
              >
                免费接口
              </UBadge>
            </div>
            <UFormField
              label="单次调用消耗余额"
              name="costCredits"
            >
              <UInput
                v-model.number="state.costCredits"
                type="number"
                min="0"
                :disabled="!state.isApiKey"
                :placeholder="state.isApiKey ? '设为 0 表示免费' : '请先开启「必需 API Key」'"
              />
              <p class="text-xs text-muted mt-1">
                只有开启「必需 API Key」后才能配置扣费。调用成功才扣，失败/业务标记失败时不扣。
              </p>
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 pt-3">
            <UButton
              variant="outline"
              color="neutral"
              @click="open = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              :loading="loading"
            >
              {{ mode === 'edit' ? '保存' : '登记' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
