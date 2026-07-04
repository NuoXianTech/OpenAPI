<script setup lang="ts">
import type { ProfileData } from '~/composables/user/use-user-settings-page'
import { parseFetchError } from '#shared/utils/client-error'

interface UserSettingsBasicCardProps {
  profile: ProfileData | null
  profileLoading: boolean
  avatarUrl?: string | null
  onSave: (displayName: string) => Promise<void>
}

const props = defineProps<UserSettingsBasicCardProps>()

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
  <DashboardSettingsSection
    title="基本信息"
    description="管理你对外展示的资料信息。"
  >
    <div
      v-if="profileLoading && !profile"
      class="text-sm text-muted py-4 text-center"
    >
      加载中...
    </div>
    <template v-else>
      <UFormField
        label="头像"
        description="头像由邮箱自动获取（Cravatar），修改邮箱后会同步更新。"
        class="flex items-center justify-between gap-2"
      >
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt="avatar"
          width="64"
          height="64"
          loading="lazy"
          decoding="async"
          class="size-16 rounded-full border border-default object-cover"
        >
        <div
          v-else
          class="size-16 rounded-full border border-default bg-elevated"
        />
      </UFormField>
      <UFormField
        label="用户名"
        description="用户名不可修改。"
        class="flex items-center justify-between gap-2"
      >
        <UInput
          :model-value="profile?.username || ''"
          disabled
          class="min-w-64"
        />
      </UFormField>
      <UFormField
        label="显示名"
        description="对外展示的名字，最多 32 字。"
        class="flex items-center justify-between gap-2"
      >
        <UInput
          v-model="displayName"
          :maxlength="32"
          placeholder="对外展示的名字"
          class="min-w-64"
        />
      </UFormField>
      <div class="flex justify-end pt-4">
        <UButton
          :loading="isSaving"
          icon="i-mdi-content-save-outline"
          @click="submit"
        >
          保存资料
        </UButton>
      </div>
    </template>
  </DashboardSettingsSection>
</template>
