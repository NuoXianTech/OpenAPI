<script setup lang="ts">
import { useUserSecuritySettings } from '~/composables/user/use-user-security-settings'

const {
  loginActivity,
  isLoginActivityLoading,
  changePassword,
  loadLoginActivity
} = useUserSecuritySettings()

onMounted(() => {
  void loadLoginActivity()
})
</script>

<template>
  <div class="space-y-8">
    <UserSettingsPasswordSection :on-submit="changePassword" />

    <UserSettingsLoginActivitySection
      :items="loginActivity"
      :loading="isLoginActivityLoading"
      @refresh="loadLoginActivity"
    />
  </div>
</template>
