<script setup lang="ts">
import type { ProfileData } from '~/composables/user/useUserProfilePage'
import { parseFetchError } from '#shared/utils/clientError'

const props = defineProps<{
  profile: ProfileData | null
  profileLoading: boolean
  avatarUrl?: string | null
  onSave: (displayName: string) => Promise<void>
}>()

const toast = useToast()
const isSaving = ref(false)
const displayName = ref('')

watch(() => props.profile, (val) => {
  if (val) displayName.value = val.displayName || ''
}, { immediate: true })

async function submit() {
  isSaving.value = true
  try {
    await props.onSave(displayName.value)
  } catch (err) {
    toast.add({ title: parseFetchError(err, '保存失败'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-account-circle-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          基本信息
        </h3>
      </div>
    </template>
    <div
      v-if="profileLoading && !profile"
      class="text-sm text-muted py-4 text-center"
    >
      加载中...
    </div>
    <div
      v-else
      class="space-y-4"
    >
      <div class="flex items-center gap-4">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt="avatar"
          class="size-16 rounded-full border border-default object-cover"
        >
        <div class="text-xs text-muted">
          头像由邮箱自动获取（Cravatar），修改邮箱后会同步更新
        </div>
      </div>

      <UFormField
        label="用户名"
        hint="用户名不可修改"
      >
        <UInput
          :model-value="profile?.username || ''"
          disabled
        />
      </UFormField>

      <UFormField label="显示名">
        <UInput
          v-model="displayName"
          :maxlength="32"
          placeholder="对外展示的名字"
        />
      </UFormField>

      <div class="flex justify-end">
        <UButton
          :loading="isSaving"
          @click="submit"
        >
          保存资料
        </UButton>
      </div>
    </div>
  </UCard>
</template>
