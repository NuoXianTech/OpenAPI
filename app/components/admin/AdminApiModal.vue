<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const schema = z.object({
  code: z.string().min(1, '必填'),
  name: z.string().min(1, '必填'),
  shortDesc: z.string().min(1, '必填').max(30, '最多30字'),
  description: z.string().min(1, '必填'),
  httpMethod: z.string().min(1, '必填'),
  apiPath: z.string().min(1, '必填'),
  docUrl: z.string().min(1, '必填'),
  status: z.number().default(1),
  category: z.string().optional(),
  isEnabled: z.boolean().default(false),
  isApiKey: z.boolean().default(false),
  isStatistics: z.boolean().default(false),
  rateLimitPerMinute: z.number().min(0).default(0),
})

type Schema = z.output<typeof schema>

const defaultState: Partial<Schema> = {
  code: '',
  name: '',
  shortDesc: '',
  description: '',
  httpMethod: 'GET',
  apiPath: '',
  docUrl: '',
  status: 1,
  category: '',
  isEnabled: true,
  isApiKey: false,
  isStatistics: true,
  rateLimitPerMinute: 0,
}

const state = reactive<Partial<Schema>>({ ...defaultState })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      code: val.code || '',
      name: val.name || '',
      shortDesc: val.shortDesc || '',
      description: val.description || '',
      httpMethod: val.httpMethod || 'GET',
      apiPath: val.apiPath || '',
      docUrl: val.docUrl || '',
      status: val.status ?? 1,
      category: val.category || '',
      isEnabled: val.isEnabled ?? true,
      isApiKey: val.isApiKey ?? false,
      isStatistics: val.isStatistics ?? true,
      rateLimitPerMinute: val.rateLimitPerMinute ?? 0,
    })
  }
  else {
    Object.assign(state, defaultState)
  }
}, { immediate: true })

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '未知', value: -1 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 },
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/apis/update', {
        method: 'PUT',
        body: { id: props.item.id, ...event.data },
      })
    }
    else {
      await $fetch('/api/admin/apis/add', {
        method: 'POST',
        body: event.data,
      })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">
          {{ isEdit ? '编辑 API' : '新增 API' }}
        </h3>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-3"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="编码"
              name="code"
            >
              <UInput
                v-model="state.code"
                placeholder="api-code"
                :disabled="isEdit"
              />
            </UFormField>
            <UFormField
              label="名称"
              name="name"
            >
              <UInput
                v-model="state.name"
                placeholder="API 名称"
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
              label="请求方法"
              name="httpMethod"
            >
              <UInput
                v-model="state.httpMethod"
                placeholder="GET,POST"
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
            label="接口路径"
            name="apiPath"
          >
            <UInput
              v-model="state.apiPath"
              placeholder="/api/v1/example"
            />
          </UFormField>
          <UFormField
            label="文档地址"
            name="docUrl"
          >
            <UInput
              v-model="state.docUrl"
              placeholder="https://docs.example.com"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="分类"
              name="category"
            >
              <UInput
                v-model="state.category"
                placeholder="分类标签"
              />
            </UFormField>
            <UFormField
              label="限流(次/分)"
              name="rateLimitPerMinute"
            >
              <UInput
                v-model.number="state.rateLimitPerMinute"
                type="number"
              />
            </UFormField>
          </div>
          <div class="flex flex-wrap gap-6 pt-1">
            <USwitch
              v-model="state.isEnabled"
              label="启用"
            />
            <USwitch
              v-model="state.isApiKey"
              label="需要 API Key"
            />
            <USwitch
              v-model="state.isStatistics"
              label="统计调用"
            />
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
              {{ isEdit ? '保存' : '创建' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
