<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { FriendLinkItem } from '#shared/types/content'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: FriendLinkItem | null }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const form = useTemplateRef('form')

const isEdit = computed(() => !!props.item)

interface FriendLinkFormState {
  title: string
  url: string
  description: string
  isActive: boolean
}

function validateFriendLinkForm(state: Partial<FriendLinkFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('title', state.title, '链接标题不能为空'),
    requiredTextError('url', state.url, '链接地址不能为空')
  )
}

const state = reactive<FriendLinkFormState>({ title: '', url: '', description: '', isActive: true })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, { title: val.title || '', url: val.url || '', description: val.description || '', isActive: val.isActive ?? true })
  } else {
    Object.assign(state, { title: '', url: '', description: '', isActive: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<FriendLinkFormState>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: { id: props.item!.id, ...event.data } })
    } else {
      await $fetch('/api/admin/friend-links/add', { method: 'POST', body: event.data })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  } finally { loading.value = false }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? '编辑链接' : '新增链接'"
    :description="isEdit ? '更新友情链接信息与展示状态。' : '添加一个展示在站点友情链接区域的站点。'"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-xl' })"
  >
    <template #body>
      <UForm
        ref="form"
        :validate="validateFriendLinkForm"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="标题"
          name="title"
        >
          <UInput
            v-model="state.title"
            placeholder="站点名称"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="URL"
          name="url"
        >
          <UInput
            v-model="state.url"
            placeholder="https://example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="描述"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :rows="3"
            class="w-full"
          />
        </UFormField>
        <div class="border-t border-default pt-3">
          <USwitch
            v-model="state.isActive"
            label="启用"
          />
        </div>
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
          {{ isEdit ? '保存' : '创建' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
