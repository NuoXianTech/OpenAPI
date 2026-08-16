<script setup lang="ts">
import type { CreatedApiKeyItem } from '#shared/types/api'

const props = defineProps<{
  keys: CreatedApiKeyItem[]
}>()

const { copyText } = useCopyFeedback()

async function copyOne(value: string) {
  await copyText(value)
}

async function copyAll() {
  await copyText(props.keys.map(key => key.apiKey).join('\n'))
}
</script>

<template>
  <UModal
    :title="$t('user.apiKeys.secret.title')"
    :description="$t('user.apiKeys.secret.description')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="$t('user.apiKeys.secret.warningTitle')"
          :description="$t('user.apiKeys.secret.warningDescription')"
        />
        <div class="max-h-80 space-y-2 overflow-auto">
          <div
            v-for="key in keys"
            :key="key.id"
            class="rounded-md border border-default bg-muted p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-toned">{{ key.name }}</span>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy"
                :aria-label="$t('common.actions.copy')"
                @click="copyOne(key.apiKey)"
              />
            </div>
            <code class="block break-all font-mono text-sm text-highlighted select-all">{{ key.apiKey }}</code>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton
          v-if="keys.length > 1"
          color="neutral"
          variant="outline"
          icon="i-lucide-copy"
          @click="copyAll"
        >
          {{ $t('user.apiKeys.secret.copyAll') }}
        </UButton>
        <UButton @click="close">
          {{ $t('common.actions.done') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
