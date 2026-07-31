<script setup lang="ts">
import { createAdminNotificationForm } from '~/composables/admin/use-admin-display-meta'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

interface AdminNotificationRecipient {
  id: number
  username: string
  email: string | null
}

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ sent: [] }>()
const toast = useToast()
const { t } = useI18n()

const form = reactive(createAdminNotificationForm())
const isSending = ref(false)
const { data: recipients, loading: recipientsLoading } = usePrivateResource<AdminNotificationRecipient[]>({
  path: '/api/admin/users/notification-recipients',
  defaultData: () => []
})

const audienceOptions = computed(() => [
  { label: t('admin.content.notifications.audiences.options.specific'), value: 'specific' },
  { label: t('admin.content.notifications.audiences.options.allCurrent'), value: 'all_current' },
  { label: t('admin.content.notifications.audiences.options.allWithFuture'), value: 'all_with_future' }
])
const levelOptions = computed(() => [
  { label: t('admin.content.notifications.levelOptions.info'), value: 'info' },
  { label: t('admin.content.notifications.levelOptions.success'), value: 'success' },
  { label: t('admin.content.notifications.levelOptions.warning'), value: 'warning' },
  { label: t('admin.content.notifications.levelOptions.critical'), value: 'critical' }
])
const userOptions = computed(() => recipients.value.map(user => ({
  label: `${user.username}${user.email ? ` <${user.email}>` : ''}`,
  value: user.id
})))

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, createAdminNotificationForm())
})

function closeModal(): void {
  open.value = false
}

async function submitSend(): Promise<void> {
  if (!form.title.trim() || !form.content.trim()) {
    toast.add({ title: t('admin.content.notifications.form.requiredContent'), color: 'warning' })
    return
  }
  if (form.audience === 'specific' && form.recipientUserIds.length === 0) {
    toast.add({ title: t('admin.content.notifications.form.recipientRequired'), color: 'warning' })
    return
  }

  isSending.value = true
  try {
    const response = await $fetch<{ deliveredCount?: number }>('/api/admin/notifications/send', {
      method: 'POST',
      body: {
        audience: form.audience,
        recipientUserIds: form.audience === 'specific' ? form.recipientUserIds : [],
        title: form.title.trim(),
        content: form.content.trim(),
        level: form.level,
        linkUrl: form.linkUrl.trim() || null
      }
    })
    toast.add({
      title: t('admin.content.notifications.feedback.sent', { count: response.deliveredCount ?? 0 }),
      color: 'success'
    })
    open.value = false
    emit('sent')
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, t('common.feedback.sendFailed')), color: 'error' })
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('admin.content.notifications.form.title')"
    :description="$t('admin.content.notifications.form.description')"
    :dismissible="!isSending"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('admin.content.notifications.form.audience')">
          <USelect
            v-model="form.audience"
            :items="audienceOptions"
            class="w-full"
          />
          <p
            v-if="form.audience === 'all_with_future'"
            class="mt-1.5 text-xs text-muted"
          >
            {{ $t('admin.content.notifications.form.futureDeliveryHint') }}
          </p>
        </UFormField>

        <UFormField
          v-if="form.audience === 'specific'"
          :label="$t('admin.content.notifications.form.recipients')"
        >
          <USelectMenu
            v-model="form.recipientUserIds"
            :items="userOptions"
            multiple
            searchable
            :loading="recipientsLoading"
            value-key="value"
            :placeholder="$t('admin.content.notifications.form.recipientsPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField
            :label="$t('admin.content.notifications.form.messageTitle')"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.title"
              :placeholder="$t('admin.content.notifications.form.titlePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.content.notifications.form.level')">
            <USelect
              v-model="form.level"
              :items="levelOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('admin.content.notifications.form.content')">
          <UTextarea
            v-model="form.content"
            :rows="6"
            :placeholder="$t('admin.content.notifications.form.contentPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('admin.content.notifications.form.linkUrl')">
          <UInput
            v-model="form.linkUrl"
            placeholder="https://example.com/post/xx"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="isSending"
          @click="closeModal"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          icon="i-mdi-send"
          :loading="isSending"
          @click="submitSend"
        >
          {{ $t('admin.content.notifications.actions.send') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
