<script setup lang="ts">
import type { ApiKeyItem } from '#shared/types/api'

const props = defineProps<{
  target: ApiKeyItem | null
}>()

const toast = useToast()
const { t } = useI18n()

async function copyKey() {
  if (!props.target?.apiKey) return
  try {
    await navigator.clipboard.writeText(props.target.apiKey)
    toast.add({ title: t('common.feedback.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('common.feedback.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <UModal
    :title="$t('user.apiKeys.view.title')"
    :description="$t('user.apiKeys.view.description', { name: props.target?.name || $t('common.apiKeys.defaultName') })"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <div class="rounded-md border border-default bg-muted p-3">
          <code
            tabindex="0"
            class="block overflow-x-auto whitespace-nowrap font-mono text-sm text-highlighted select-all"
          >{{ props.target?.apiKey || '' }}</code>
        </div>
        <p class="flex items-start gap-1.5 text-xs leading-5 text-muted">
          <UIcon
            name="i-mdi-shield-key-outline"
            class="mt-0.5 size-4 shrink-0"
          />
          <span>{{ $t('user.apiKeys.view.hint') }}</span>
        </p>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-mdi-content-copy"
          @click="copyKey"
        >
          {{ $t('common.actions.copy') }}
        </UButton>
        <UButton @click="close">
          {{ $t('common.actions.done') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
