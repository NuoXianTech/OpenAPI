<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/client-error'

interface ApiCategoryItem {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  isEnabled: boolean
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: ApiCategoryItem | null }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const form = useTemplateRef('form')

const isEdit = computed(() => !!props.item)

const schema = z.object({
  code: z.string().trim().min(1, '必填').max(64),
  name: z.string().trim().min(1, '必填').max(64),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isEnabled: z.boolean().default(true)
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ code: '', name: '', description: '', icon: '', color: '', sortOrder: 0, isEnabled: true })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      code: val.code,
      name: val.name,
      description: val.description || '',
      icon: val.icon || '',
      color: val.color || '',
      sortOrder: val.sortOrder ?? 0,
      isEnabled: val.isEnabled ?? true
    })
  } else {
    Object.assign(state, { code: '', name: '', description: '', icon: '', color: '', sortOrder: 0, isEnabled: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      const { code: _code, ...rest } = event.data
      await $fetch('/api/admin/api-categories/update', {
        method: 'PUT',
        body: { id: props.item!.id, ...rest }
      })
    } else {
      await $fetch('/api/admin/api-categories/add', { method: 'POST', body: event.data })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
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
    :title="isEdit ? '编辑分类' : '新增分类'"
  >
    <template #body>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="space-y-3"
        @submit="onSubmit"
      >
        <UFormField
          label="编码 (code)"
          name="code"
          help="作为分类唯一键，创建后不可修改"
        >
          <UInput
            v-model="state.code"
            :disabled="isEdit"
            placeholder="如 ai-tools"
          />
        </UFormField>
        <UFormField
          label="名称"
          name="name"
        >
          <UInput
            v-model="state.name"
            placeholder="如 AI 工具"
          />
        </UFormField>
        <UFormField
          label="描述"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :rows="2"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="图标 (i-mdi-*)"
            name="icon"
          >
            <UInput
              v-model="state.icon"
              placeholder="i-mdi-robot-outline"
            />
          </UFormField>
          <UFormField
            label="颜色标识"
            name="color"
          >
            <UInput
              v-model="state.color"
              placeholder="primary / #1abc9c"
            />
          </UFormField>
        </div>
        <UFormField
          label="排序"
          name="sortOrder"
          help="数字越小越靠前"
        >
          <UInput
            v-model.number="state.sortOrder"
            type="number"
          />
        </UFormField>
        <USwitch
          v-model="state.isEnabled"
          label="启用"
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="open = false"
        >
          取消
        </UButton>
        <UButton
          :loading="loading"
          @click="form?.submit()"
        >
          {{ isEdit ? '保存' : '创建' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
