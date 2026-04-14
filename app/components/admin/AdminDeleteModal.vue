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
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold">
          {{ props.title || '确认删除' }}
        </h3>
        <p class="text-sm text-muted mt-2">
          {{ props.description || '此操作不可撤销，确定要删除吗？' }}
        </p>
        <div class="flex justify-end gap-2 mt-6">
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
      </div>
    </template>
  </UModal>
</template>
