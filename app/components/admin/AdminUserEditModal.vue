<script setup lang="ts">
import type { AdminUserItem } from '~/composables/admin/useAdminUsersPage'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
  onSubmit: (id: number, payload: { username: string, email: string, displayName: string, isActive: boolean }) => Promise<void>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()
const form = reactive({ username: '', email: '', displayName: '', isActive: false })
const loading = ref(false)

watch(() => props.target, (val) => {
  if (!val) return
  Object.assign(form, {
    username: val.username || '',
    email: val.email || '',
    displayName: val.displayName || '',
    isActive: val.isActive ?? false
  })
})

async function submit() {
  if (!props.target) return
  loading.value = true
  try {
    await props.onSubmit(props.target.id, { ...form })
    emit('update:open', false)
  } catch (err) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '更新失败', color: 'error' })
  } finally {
    loading.value = false
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
