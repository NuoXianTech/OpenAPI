<script setup lang="ts">
import { useUserProfileSettings } from '~/composables/user/use-user-profile-settings'

const { user, fetchMe } = useAuth()
const {
  profile,
  isProfileLoading,
  loadProfile,
  updateProfile,
  updateLanguagePreference,
  requestEmailChange
} = useUserProfileSettings()

const avatarUrl = computed(() => profile.value?.avatarUrl || user.value?.avatarUrl || null)

onMounted(async () => {
  await loadProfile()
  // 头像由邮箱派生，进入资料页时顺带刷新登录态以保证头像最新
  void fetchMe()
})
</script>

<template>
  <div class="space-y-8">
    <UserSettingsProfileSection
      :profile="profile"
      :profile-loading="isProfileLoading"
      :avatar-url="avatarUrl"
      :on-save="updateProfile"
    />

    <UserSettingsLanguageSection
      :profile="profile"
      :profile-loading="isProfileLoading"
      :on-save="updateLanguagePreference"
    />

    <UserSettingsEmailSection
      :profile="profile"
      :on-request-change="requestEmailChange"
    />
  </div>
</template>
