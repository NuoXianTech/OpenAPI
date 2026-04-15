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
  subtitle: z.string().optional(),
  icon: z.string().min(1, '必填'),
  actionType: z.string().min(1, '必填'),
  actionValue: z.string().min(1, '必填'),
  actionLabel: z.string().min(1, '必填'),
  target: z.string().min(1, '必填'),
  sort: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: '',
  subtitle: '',
  icon: 'mdi:link-variant',
  actionType: 'link',
  actionValue: '',
  actionLabel: '打开',
  target: '_blank',
  sort: 0,
  isActive: true,
})

const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      title: val.title || '',
      subtitle: val.subtitle || '',
      icon: val.icon || 'mdi:link-variant',
      actionType: val.actionType || 'link',
      actionValue: val.actionValue || '',
      actionLabel: val.actionLabel || '打开',
      target: val.target || '_blank',
      sort: val.sort ?? 0,
      isActive: val.isActive ?? true,
    })
  }
  else {
    Object.assign(state, {
      title: '',
      subtitle: '',
      icon: 'mdi:link-variant',
      actionType: 'link',
      actionValue: '',
      actionLabel: '打开',
      target: '_blank',
      sort: 0,
      isActive: true,
    })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/fab-menu/update', { method: 'PUT', body: { id: props.item.id, ...event.data } })
    }
    else {
      await $fetch('/api/admin/fab-menu/add', { method: 'POST', body: event.data })
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

const actionTypeOptions = [
  { label: '链接', value: 'link' },
  { label: '路由', value: 'route' },
  { label: '动作', value: 'action' },
]

const targetOptions = [
  { label: '新窗口', value: '_blank' },
  { label: '当前窗口', value: '_self' },
]
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">{{ isEdit ? '编辑菜单项' : '新增菜单项' }}</h3>
        <UForm :schema="schema" :state="state" class="space-y-3" @submit="onSubmit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="标题" name="title">
              <UInput v-model="state.title" placeholder="菜单标题" />
            </UFormField>
            <UFormField label="副标题" name="subtitle">
              <UInput v-model="state.subtitle" placeholder="可选" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="图标" name="icon">
              <UInput v-model="state.icon" placeholder="mdi:link-variant" />
            </UFormField>
            <UFormField label="排序" name="sort">
              <UInput v-model.number="state.sort" type="number" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="动作类型" name="actionType">
              <USelect v-model="state.actionType" :items="actionTypeOptions" />
            </UFormField>
            <UFormField label="打开方式" name="target">
              <USelect v-model="state.target" :items="targetOptions" />
            </UFormField>
          </div>
          <UFormField label="动作值" name="actionValue">
            <UInput v-model="state.actionValue" placeholder="https://example.com 或 /path" />
          </UFormField>
          <UFormField label="按钮文本" name="actionLabel">
            <UInput v-model="state.actionLabel" placeholder="打开" />
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
