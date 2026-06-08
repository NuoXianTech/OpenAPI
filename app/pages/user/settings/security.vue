<script setup lang="ts">
import { useUserSettingsPage } from '~/composables/user/useUserSettingsPage'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

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
  <div class="space-y-6 max-w-3xl">
    <UserSettingsPasswordCard :on-submit="changePassword" />

    <UserSettingsLoginActivityCard
      :items="loginActivity"
      :loading="loginActivityLoading"
      @refresh="loadLoginActivity"
    />
  </div>
</template>
