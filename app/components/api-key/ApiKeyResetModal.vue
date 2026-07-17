<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseFetchError } from '~/utils/client-error'
import type { ApiKeyItem } from '#shared/types/api'

const props = defineProps<{
  target: ApiKeyItem | null
  onReset: (id: number) => Promise<ApiKeyItem | undefined>
}>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
const { t } = useI18n()
const loading = ref(false)
const result = ref<ApiKeyItem | null>(null)

watch(
  () => props.target,
  () => {
    loading.value = false
    result.value = null
  }
)

async function confirmReset() {
  if (!props.target) return
  loading.value = true
  try {
    const next = await props.onReset(props.target.id)
    result.value = next || null
    emit('saved')
    toast.add({ title: t('common.apiKeys.reset.success'), color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.apiKeys.reset.failed')), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('common.feedback.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('common.feedback.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <UModal
    :title="result ? $t('common.apiKeys.reset.saveNewTitle') : $t('common.apiKeys.reset.confirmTitle')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UAlert
        v-if="!result"
        color="warning"
        variant="subtle"
        :title="$t('common.apiKeys.reset.warningTitle')"
        :description="$t('common.apiKeys.reset.warningDescription', { name: props.target?.name || $t('common.apiKeys.defaultName') })"
        icon="i-mdi-alert-outline"
      />
      <code
        v-else
        class="block font-mono text-sm break-all p-3 rounded bg-elevated"
      >
        {{ result.apiKey }}
      </code>
    </template>

    <template #footer="{ close }">
      <div
        v-if="!result"
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          @click="close"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          color="warning"
          :loading="loading"
          @click="confirmReset"
        >
          {{ $t('common.apiKeys.reset.confirmAction') }}
        </UButton>
      </div>
      <div
        v-else
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          icon="i-mdi-content-copy"
          @click="copy(result.apiKey)"
        >
          {{ $t('common.actions.copy') }}
        </UButton>
        <UButton @click="close">
          {{ $t('common.apiKeys.reset.savedAction') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
