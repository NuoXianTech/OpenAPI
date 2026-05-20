<script setup lang="ts">
import type { AdminUserItem } from '~/composables/admin/useAdminUsersPage'

interface OAuthBinding {
  id: number
  provider: string
  providerUserId: string
  nickname: string | null
  email: string | null
  avatarUrl: string | null
  linkedAt: string
  lastLoginAt: string | null
}

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
  onSubmit: (id: number, payload: { username: string, email: string, displayName: string, isActive: boolean }) => Promise<boolean>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({ username: '', email: '', displayName: '', isActive: false })
const loading = ref(false)

const bindings = ref<OAuthBinding[]>([])
const bindingsLoading = ref(false)

watch(() => props.target, (val) => {
  if (!val) return
  Object.assign(form, {
    username: val.username || '',
    email: val.email || '',
    displayName: val.displayName || '',
    isActive: val.isActive ?? false
  })
})

watch(() => props.open, async (opened) => {
  if (!opened || !props.target) {
    bindings.value = []
    return
  }
  bindingsLoading.value = true
  try {
    const data = await $fetch<OAuthBinding[]>('/api/admin/users/oauth-accounts', {
      query: { userId: props.target.id }
    })
    bindings.value = data || []
  } catch (err) {
    console.error('failed to load oauth bindings', err)
    bindings.value = []
  } finally {
    bindingsLoading.value = false
  }
})

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

async function submit() {
  if (!props.target) return
  loading.value = true
  const ok = await props.onSubmit(props.target.id, { ...form })
  loading.value = false
  if (ok) emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">
          编辑用户
        </h3>
        <form
          class="space-y-3"
          @submit.prevent="submit"
        >
          <UFormField label="用户名">
            <UInput v-model="form.username" />
          </UFormField>
          <UFormField label="邮箱">
            <UInput
              v-model="form.email"
              type="email"
            />
          </UFormField>
          <UFormField label="显示名">
            <UInput
              v-model="form.displayName"
              :maxlength="32"
            />
          </UFormField>
          <USwitch
            v-model="form.isActive"
            label="已激活"
          />

          <div class="pt-3 border-t border-default space-y-2">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-shield-key-outline"
                class="size-4 text-muted"
              />
              <span class="text-sm font-medium">已绑定第三方</span>
              <span class="text-xs text-muted">（只读）</span>
            </div>
            <div
              v-if="bindingsLoading"
              class="text-xs text-muted py-2"
            >
              加载中...
            </div>
            <div
              v-else-if="bindings.length === 0"
              class="text-xs text-muted italic py-2"
            >
              该用户未绑定任何第三方账号
            </div>
            <div
              v-else
              class="space-y-1"
            >
              <div
                v-for="b in bindings"
                :key="b.id"
                class="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-elevated/50"
              >
                <UBadge
                  variant="subtle"
                  color="neutral"
                >
                  {{ b.provider }}
                </UBadge>
                <span class="font-mono">{{ b.nickname || b.email || `#${b.providerUserId}` }}</span>
                <span class="ml-auto text-muted">最近登录 {{ formatDate(b.lastLoginAt) }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3">
            <UButton
              variant="outline"
              color="neutral"
              @click="emit('update:open', false)"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              :loading="loading"
            >
              保存
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
