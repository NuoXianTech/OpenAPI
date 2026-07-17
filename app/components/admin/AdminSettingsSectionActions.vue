<script setup lang="ts">
interface AdminSettingsSectionActionsProps {
  dirty: boolean
  saving?: boolean
  disabled?: boolean
}

defineProps<AdminSettingsSectionActionsProps>()
const { t } = useI18n()

const emit = defineEmits<{
  save: []
}>()
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-end">
    <div class="flex items-center justify-end gap-2">
      <UButton
        type="button"
        icon="i-mdi-content-save-outline"
        :loading="saving"
        :disabled="!dirty || disabled"
        @click="emit('save')"
      >
        {{ t('common.actions.save') }}
      </UButton>
    </div>
  </div>
</template>
