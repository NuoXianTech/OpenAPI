<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title || '确认删除'"
    :description="props.description || '此操作不可撤销，确定要删除吗？'"
  >
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
          color="error"
          :loading="props.loading"
          @click="emit('confirm')"
        >
          删除
        </UButton>
      </div>
    </template>
  </UModal>
</template>
