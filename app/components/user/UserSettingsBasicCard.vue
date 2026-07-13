<script setup lang="ts">
import type { ProfileData } from '~/composables/user/use-user-settings-page'
import { parseFetchError } from '~/utils/client-error'

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
const avatarAlt = computed(() => props.profile?.displayName || props.profile?.username || '用户头像')

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
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UAvatar
          :src="avatarUrl || undefined"
          :alt="avatarAlt"
          class="size-16 border border-default bg-elevated"
        />
      </UFormField>
      <UFormField
        label="用户名"
        description="用户名不可修改。"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          :model-value="profile?.username || ''"
          disabled
          class="w-full sm:w-60"
        />
      </UFormField>
      <UFormField
        label="昵称"
        description="用于公开展示的名字，可使用真实姓名或昵称"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="displayName"
          :maxlength="32"
          class="w-full sm:w-60"
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
