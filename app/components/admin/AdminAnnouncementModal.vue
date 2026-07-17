<script setup lang="ts">
import type { Announcement } from '#shared/types/content'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item: Announcement | null }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const { t } = useI18n()

const form = reactive({
  title: '',
  content: '',
  level: 'info' as Announcement['level'],
  isPinned: false,
  isEnabled: true,
  linkUrl: '',
  sortOrder: 0
})

const loading = ref(false)
const isEdit = computed(() => !!props.item)

const levelOptions = computed(() => [
  { label: t('admin.content.announcements.levelOptions.info'), value: 'info' },
  { label: t('admin.content.announcements.levelOptions.success'), value: 'success' },
  { label: t('admin.content.announcements.levelOptions.warning'), value: 'warning' },
  { label: t('admin.content.announcements.levelOptions.critical'), value: 'critical' }
])

watch(() => [props.item, open.value], () => {
  if (!open.value) return
  if (props.item) {
    Object.assign(form, {
      title: props.item.title,
      content: props.item.content,
      level: props.item.level,
      isPinned: props.item.isPinned,
      isEnabled: props.item.isEnabled,
      linkUrl: props.item.linkUrl || '',
      sortOrder: props.item.sortOrder
    })
  } else {
    Object.assign(form, {
      title: '',
      content: '',
      level: 'info',
      isPinned: false,
      isEnabled: true,
      linkUrl: '',
      sortOrder: 0
    })
  }
}, { immediate: true })

async function onSubmit() {
  if (!form.title.trim() || !form.content.trim()) {
    toast.add({ title: t('admin.content.announcements.form.requiredContent'), color: 'warning' })
    return
  }
  loading.value = true
  try {
    const body = {
      title: form.title.trim(),
      content: form.content,
      level: form.level,
      isPinned: form.isPinned,
      isEnabled: form.isEnabled,
      linkUrl: form.linkUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0
    }
    if (isEdit.value && props.item) {
      await $fetch('/api/admin/announcements/update', {
        method: 'PUT',
        body: { id: props.item.id, ...body }
      })
    } else {
      await $fetch('/api/admin/announcements/add', {
        method: 'POST',
        body
      })
    }
    toast.add({
      title: isEdit.value ? t('common.feedback.updated') : t('admin.content.announcements.feedback.created'),
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.saveFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? $t('admin.content.announcements.form.editTitle') : $t('admin.content.announcements.form.createTitle')"
    :description="isEdit
      ? $t('admin.content.announcements.form.editDescription')
      : $t('admin.content.announcements.form.createDescription')"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField
            :label="$t('admin.content.announcements.form.title')"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.title"
              :placeholder="$t('admin.content.announcements.form.titlePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.content.announcements.form.level')">
            <USelect
              v-model="form.level"
              :items="levelOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('admin.content.announcements.form.content')">
          <UTextarea
            v-model="form.content"
            :rows="6"
            :placeholder="$t('admin.content.announcements.form.contentPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UFormField :label="$t('admin.content.announcements.form.linkUrl')">
            <UInput
              v-model="form.linkUrl"
              placeholder="https://example.com/post/xx"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('admin.content.announcements.form.sortOrder')">
            <UInput
              v-model.number="form.sortOrder"
              type="number"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap gap-6 border-t border-default pt-3">
          <USwitch
            v-model="form.isEnabled"
            :label="$t('admin.content.announcements.form.enabled')"
          />
          <USwitch
            v-model="form.isPinned"
            :label="$t('admin.content.announcements.form.pinned')"
          />
        </div>
      </div>
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
          @click="onSubmit"
        >
          {{ isEdit ? $t('common.actions.save') : $t('common.actions.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
