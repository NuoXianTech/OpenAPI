<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

interface Props {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: ButtonProps['color']
  onConfirm?: () => Promise<void> | void
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [value: boolean] }>()
const { t } = useI18n()

const loading = ref(false)

async function handleConfirm() {
  if (!props.onConfirm) {
    emit('close', true)
    return
  }
  loading.value = true
  try {
    await props.onConfirm()
    emit('close', true)
  } catch {
    // 调用方负责在 onConfirm 里 toast 具体错误。这里吞掉异常，让弹窗保持打开供用户重试。
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :title="props.title || t('common.dialog.confirmTitle')"
    :description="props.description"
    :dismissible="!loading"
    :close="!loading"
  >
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          :disabled="loading"
          @click="emit('close', false)"
        >
          {{ props.cancelLabel || $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :color="props.confirmColor || 'error'"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ props.confirmLabel || $t('common.actions.delete') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
