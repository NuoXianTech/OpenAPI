<script setup lang="ts">
import { useUserSettingsPage } from '~/composables/user/use-user-settings-page'

const {
  loginActivity,
  loginActivityLoading,
  changePassword,
  loadLoginActivity
} = useUserSettingsPage()

onMounted(() => {
  void loadLoginActivity()
})
</script>

<template>
  <div class="space-y-8">
    <UserSettingsPasswordCard :on-submit="changePassword" />

    <UserSettingsLoginActivityCard
      :items="loginActivity"
      :loading="loginActivityLoading"
      @refresh="loadLoginActivity"
    />
  </div>
</template>
