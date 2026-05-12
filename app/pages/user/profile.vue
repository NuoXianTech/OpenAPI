<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useUserProfilePage } from '~/composables/user/useUserProfilePage'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const route = useRoute()
const { user, fetchMe } = useAuth()

const {
  profile,
  profileLoading,
  oauthList,
  oauthEnabled,
  oauthLoading,
  loadProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  loadOauth,
  startBind,
  unbind,
  notifyOauthCallback,
} = useUserProfilePage()

onMounted(async () => {
  await Promise.all([loadProfile(), loadOauth()])
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
          <UserHeaderUser />
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
      </div>
    </template>
  </UDashboardPanel>
</template>
