<script setup lang="ts">
import { useUserSettingsPage } from '~/composables/user/useUserSettingsPage'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const { user, fetchMe } = useAuth()
const {
  profile,
  profileLoading,
  loadProfile,
  updateProfile,
  requestEmailChange
} = useUserSettingsPage()

onMounted(async () => {
  await loadProfile()
  // 头像由邮箱派生，进入资料页时顺带刷新登录态以保证头像最新
  void fetchMe()
})
</script>

<template>
  <div class="space-y-8">
    <UserSettingsBasicCard
      :profile="profile"
      :profile-loading="profileLoading"
      :avatar-url="user?.avatarUrl"
      :on-save="updateProfile"
    />

    <UserSettingsEmailCard
      :profile="profile"
      :on-request-change="requestEmailChange"
    />
  </div>
</template>
