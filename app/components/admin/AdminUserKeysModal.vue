<script setup lang="ts">
import type { AdminUserItem, AdminApiKeyItem } from '~/composables/admin/useAdminUsersPage'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()
const keys = ref<AdminApiKeyItem[]>([])
const loading = ref(false)

async function load() {
  if (!props.target) return
  loading.value = true
  try {
    const res = await $fetch<AdminApiKeyItem[]>('/api/admin/users/apikeys', { query: { userId: props.target.id } })
    keys.value = res || []
  } catch {
    keys.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.target?.id] as const, ([isOpen]) => {
  if (isOpen) void load()
})

async function add() {
  if (!props.target) return
  try {
    await $fetch('/api/admin/users/apikeys/add', { method: 'POST', body: { userId: props.target.id } })
    toast.add({ title: 'API Key 已创建', color: 'success' })
    await load()
  } catch {
    toast.add({ title: '创建失败', color: 'error' })
  }
}

async function reset(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已重置', color: 'success' })
    await load()
  } catch {
    toast.add({ title: '重置失败', color: 'error' })
  }
}

async function remove(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已删除', color: 'success' })
    await load()
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">
            {{ target?.username }} 的 API Keys
          </h3>
          <UButton
            size="sm"
            icon="i-mdi-plus"
            @click="add"
          >
            新增
          </UButton>
        </div>
        <div
          v-if="loading"
          class="text-sm text-muted py-4 text-center"
        >
          加载中...
        </div>
        <div
          v-else-if="keys.length === 0"
          class="text-sm text-muted py-4 text-center"
        >
          暂无 API Key
        </div>
        <div
          v-else
          class="space-y-2"
        >
          <div
            v-for="key in keys"
            :key="key.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-default p-3"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium">
                {{ key.name }}
              </div>
              <div class="text-xs text-muted font-mono truncate">
                {{ key.apiKey }}
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                @click="reset(key.id)"
              >
                重置
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                color="error"
                @click="remove(key.id)"
              >
                删除
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
