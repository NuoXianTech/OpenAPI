<script setup lang="ts">
interface AdminSettingsSectionActionsProps {
  dirty: boolean
  changedCount?: number
  saving?: boolean
  disabled?: boolean
}

defineProps<AdminSettingsSectionActionsProps>()

const emit = defineEmits<{
  save: []
  reset: []
}>()
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-muted">
      <template v-if="dirty">
        当前部分有 {{ changedCount ?? 0 }} 项未保存修改
      </template>
      <template v-else>
        当前部分已保存
      </template>
    </p>

    <div class="flex items-center justify-end gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        :disabled="!dirty || saving || disabled"
        @click="emit('reset')"
      >
        撤销修改
      </UButton>
      <UButton
        type="button"
        icon="i-mdi-content-save-outline"
        :loading="saving"
        :disabled="!dirty || disabled"
        @click="emit('save')"
      >
        保存此部分
      </UButton>
    </div>
  </div>
</template>
