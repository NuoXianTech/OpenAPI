<script setup lang="ts">
import { useUserSettingsPage } from '~/composables/user/use-user-settings-page'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const route = useRoute()
const {
  oauthList,
  oauthEnabled,
  oauthLoading,
  loadOauth,
  startBind,
  unbind,
  notifyOauthCallback
} = useUserSettingsPage()

onMounted(async () => {
  await loadOauth()
  // 绑定回跳带回 oauth_bound / oauth_error，在此弹 toast 反馈
  notifyOauthCallback(route.query)
})
</script>

<template>
  <div class="space-y-8">
    <UserSettingsOauthCard
      :list="oauthList"
      :enabled="oauthEnabled"
      :loading="oauthLoading"
      @refresh="loadOauth"
      @bind="startBind"
      @unbind="unbind"
    />
  </div>
</template>
