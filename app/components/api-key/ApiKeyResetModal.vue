<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseFetchError } from '#shared/utils/client-error'
import type { ApiKeyItem } from '~/types/api'

const props = defineProps<{
  target: ApiKeyItem | null
  onReset: (id: number) => Promise<ApiKeyItem | undefined>
}>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
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
    toast.add({ title: '已重置，旧 Key 立即失效', color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, '重置失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}
</script>

<template>
  <UModal
    :title="result ? '已重置，请保存新 Key' : '确认重置 API Key'"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UAlert
        v-if="!result"
        color="warning"
        variant="subtle"
        title="重置将立即让旧 Key 失效"
        :description="`将重置「${props.target?.name || '默认密钥'}」，所有正在使用旧 Key 的调用方会立刻失败，请确认后再继续。`"
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
          取消
        </UButton>
        <UButton
          color="warning"
          :loading="loading"
          @click="confirmReset"
        >
          确认重置
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
          复制
        </UButton>
        <UButton @click="close">
          我已保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
