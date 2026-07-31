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
  <UButton
    type="button"
    icon="i-mdi-content-save-outline"
    :loading="saving"
    :disabled="!dirty || disabled"
    @click="emit('save')"
  >
    {{ t('common.actions.save') }}
  </UButton>
</template>
