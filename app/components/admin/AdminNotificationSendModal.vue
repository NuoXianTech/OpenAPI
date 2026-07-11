<script setup lang="ts">
import {
  ADMIN_NOTIFICATION_AUDIENCE_OPTIONS,
  ADMIN_NOTIFICATION_LEVEL_OPTIONS,
  createAdminNotificationForm,
  type AdminNotificationUserItem
} from '~/composables/admin/use-admin-display-meta'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

interface Props {
  users: AdminNotificationUserItem[]
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<Props>()
const emit = defineEmits<{ sent: [] }>()
const toast = useToast()

const form = reactive(createAdminNotificationForm())
const isSending = ref(false)

const audienceOptions = ADMIN_NOTIFICATION_AUDIENCE_OPTIONS
const levelOptions = ADMIN_NOTIFICATION_LEVEL_OPTIONS
const userOptions = computed(() => props.users
  .filter(user => !user.isBanned)
  .map(user => ({
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
    toast.add({ title: '标题和内容必填', color: 'warning' })
    return
  }
  if (form.audience === 'specific' && form.recipientUserIds.length === 0) {
    toast.add({ title: '请选择收件人或改为全员发送', color: 'warning' })
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
    toast.add({ title: `已发送（投递 ${response.deliveredCount ?? 0} 人）`, color: 'success' })
    open.value = false
    emit('sent')
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, '发送失败'), color: 'error' })
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="发送通知"
    description="向指定用户、当前全员或当前及未来注册用户发送站内通知。"
    :dismissible="!isSending"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="发送范围">
          <USelect
            v-model="form.audience"
            :items="audienceOptions"
            class="w-full"
          />
          <p
            v-if="form.audience === 'all_with_future'"
            class="mt-1.5 text-xs text-muted"
          >
            新注册用户首次激活时将自动补发本条通知。
          </p>
        </UFormField>

        <UFormField
          v-if="form.audience === 'specific'"
          label="收件人（可多选）"
        >
          <USelectMenu
            v-model="form.recipientUserIds"
            :items="userOptions"
            multiple
            searchable
            value-key="value"
            placeholder="搜索用户名或邮箱"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField
            label="标题"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.title"
              placeholder="通知标题（最多 200 字）"
              class="w-full"
            />
          </UFormField>
          <UFormField label="级别">
            <USelect
              v-model="form.level"
              :items="levelOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="内容">
          <UTextarea
            v-model="form.content"
            :rows="6"
            placeholder="支持纯文本，换行将保留"
            class="w-full"
          />
        </UFormField>

        <UFormField label="附加链接（可选）">
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
          取消
        </UButton>
        <UButton
          icon="i-mdi-send"
          :loading="isSending"
          @click="submitSend"
        >
          发送通知
        </UButton>
      </div>
    </template>
  </UModal>
</template>
