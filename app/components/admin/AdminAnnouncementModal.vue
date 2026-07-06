<script setup lang="ts">
import { parseFetchError } from '#shared/utils/client-error'

interface Announcement {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  isPinned: boolean
  isEnabled: boolean
  linkUrl: string | null
  sortOrder: number
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item: Announcement | null }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

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

const levelOptions = [
  { label: '公告 (info)', value: 'info' },
  { label: '通知 (success)', value: 'success' },
  { label: '提醒 (warning)', value: 'warning' },
  { label: '紧急 (critical)', value: 'critical' }
]

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
    toast.add({ title: '标题和内容必填', color: 'warning' })
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
    toast.add({ title: isEdit.value ? '已更新' : '已创建', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '保存失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? '编辑公告' : '新建公告'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <UFormField
            label="标题"
            class="col-span-2"
          >
            <UInput
              v-model="form.title"
              placeholder="公告标题（最多 200 字）"
            />
          </UFormField>
          <UFormField label="级别">
            <USelect
              v-model="form.level"
              :items="levelOptions"
            />
          </UFormField>
        </div>

        <UFormField label="内容">
          <UTextarea
            v-model="form.content"
            :rows="6"
            placeholder="支持纯文本，换行将保留"
            class="w-full sm:max-w-lg"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="详情链接（可选）">
            <UInput
              v-model="form.linkUrl"
              placeholder="https://example.com/post/xx"
            />
          </UFormField>
          <UFormField label="排序值（小在前）">
            <UInput
              v-model.number="form.sortOrder"
              type="number"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap gap-6 pt-2 border-t border-default">
          <USwitch
            v-model="form.isEnabled"
            label="启用"
          />
          <USwitch
            v-model="form.isPinned"
            label="置顶"
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
          取消
        </UButton>
        <UButton
          :loading="loading"
          @click="onSubmit"
        >
          {{ isEdit ? '保存' : '创建' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
