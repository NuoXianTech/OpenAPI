<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const schema = z.object({
  title: z.string().min(1, '必填'),
  url: z.string().min(1, '必填'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ title: '', url: '', description: '', isActive: true })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, { title: val.title || '', url: val.url || '', description: val.description || '', isActive: val.isActive ?? true })
  }
  else {
    Object.assign(state, { title: '', url: '', description: '', isActive: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: { id: props.item.id, ...event.data } })
    }
    else {
      await $fetch('/api/admin/friend-links/add', { method: 'POST', body: event.data })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally { loading.value = false }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">{{ isEdit ? '编辑链接' : '新增链接' }}</h3>
        <UForm :schema="schema" :state="state" class="space-y-3" @submit="onSubmit">
          <UFormField label="标题" name="title">
            <UInput v-model="state.title" placeholder="站点名称" />
          </UFormField>
          <UFormField label="URL" name="url">
            <UInput v-model="state.url" placeholder="https://example.com" />
          </UFormField>
          <UFormField label="描述" name="description">
            <UTextarea v-model="state.description" :rows="3" />
          </UFormField>
          <USwitch v-model="state.isActive" label="启用" />
          <div class="flex justify-end gap-2 pt-3">
            <UButton variant="outline" color="neutral" @click="open = false">取消</UButton>
            <UButton type="submit" :loading="loading">{{ isEdit ? '保存' : '创建' }}</UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
