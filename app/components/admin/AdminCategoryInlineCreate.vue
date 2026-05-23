<script setup lang="ts">
import { parseFetchError } from '#shared/utils/clientError'

const emit = defineEmits<{ created: [id: number] }>()

const open = ref(false)
const code = ref('')
const name = ref('')
const loading = ref(false)
const toast = useToast()

function reset() {
  code.value = ''
  name.value = ''
}

function close() {
  open.value = false
  reset()
}

async function submit() {
  const trimmedCode = code.value.trim()
  const trimmedName = name.value.trim()
  if (!trimmedCode || !trimmedName) {
    toast.add({ title: 'code 与名称均必填', color: 'warning' })
    return
  }
  loading.value = true
  try {
    const res = await $fetch<{ id?: number }>('/api/admin/api-categories/add', {
      method: 'POST',
      body: { code: trimmedCode, name: trimmedName, isEnabled: true }
    })
    if (res?.id) emit('created', res.id)
    toast.add({ title: '已新增分类', color: 'success' })
    close()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '新增失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}

defineExpose({ toggle: () => { open.value = !open.value } })
</script>

<template>
  <div
    v-if="open"
    class="mt-2 p-2 rounded-md border border-default bg-elevated/30 flex flex-col gap-2"
  >
    <div class="grid grid-cols-2 gap-2">
      <UInput
        v-model="code"
        placeholder="code（如：weather）"
        size="sm"
      />
      <UInput
        v-model="name"
        placeholder="名称（如：天气类）"
        size="sm"
      />
    </div>
    <div class="flex justify-end gap-2">
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        type="button"
        @click="close"
      >
        取消
      </UButton>
      <UButton
        size="xs"
        :loading="loading"
        type="button"
        @click="submit"
      >
        新增
      </UButton>
    </div>
  </div>
</template>
