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
const { t } = useI18n()

const isEdit = computed(() => !!props.item)

interface FriendLinkFormState {
  title: string
  url: string
  description: string
  isActive: boolean
}

function validateFriendLinkForm(state: Partial<FriendLinkFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('title', state.title, t('admin.content.friendLinks.validation.titleRequired')),
    requiredTextError('url', state.url, t('admin.content.friendLinks.validation.urlRequired'))
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
    toast.add({
      title: isEdit.value ? t('admin.content.friendLinks.feedback.updated') : t('admin.content.friendLinks.feedback.created'),
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  } finally { loading.value = false }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? $t('admin.content.friendLinks.form.editTitle') : $t('admin.content.friendLinks.form.createTitle')"
    :description="isEdit
      ? $t('admin.content.friendLinks.form.editDescription')
      : $t('admin.content.friendLinks.form.createDescription')"
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
          :label="$t('admin.content.friendLinks.form.title')"
          name="title"
        >
          <UInput
            v-model="state.title"
            :placeholder="$t('admin.content.friendLinks.form.titlePlaceholder')"
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
          :label="$t('admin.content.friendLinks.form.description')"
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
            :label="$t('admin.content.friendLinks.form.enabled')"
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
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :loading="loading"
          @click="() => { form?.submit() }"
        >
          {{ isEdit ? $t('common.actions.save') : $t('common.actions.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
