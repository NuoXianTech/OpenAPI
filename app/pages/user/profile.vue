<script setup lang="ts">
import { useUserProfilePage } from '~/composables/user/useUserProfilePage'

useHead({ title: '账号信息' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const route = useRoute()
const { user, fetchMe } = useAuth()

const {
  profile,
  profileLoading,
  oauthList,
  oauthEnabled,
  oauthLoading,
  loginActivity,
  loginActivityLoading,
  loadProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  loadOauth,
  loadLoginActivity,
  startBind,
  unbind,
  notifyOauthCallback
} = useUserProfilePage()

onMounted(async () => {
  await Promise.all([loadProfile(), loadOauth(), loadLoginActivity()])
  notifyOauthCallback(route.query)
  // 同步刷新一下登录态（avatar 可能因 email 变更而需要刷新）
  void fetchMe()
})
</script>

<template>
  <UDashboardPanel id="user-profile">
    <template #header>
      <UDashboardNavbar title="个人设置">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 max-w-3xl">
        <UserProfileBasicCard
          :profile="profile"
          :profile-loading="profileLoading"
          :avatar-url="user?.avatarUrl"
          :on-save="updateProfile"
        />

        <UserProfileEmailCard
          :profile="profile"
          :on-request-change="requestEmailChange"
        />

        <UserProfilePasswordCard :on-submit="changePassword" />

        <UserProfileOauthCard
          :list="oauthList"
          :enabled="oauthEnabled"
          :loading="oauthLoading"
          @refresh="loadOauth"
          @bind="startBind"
          @unbind="unbind"
        />

        <UserProfileLoginActivityCard
          :items="loginActivity"
          :loading="loginActivityLoading"
          @refresh="loadLoginActivity"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
