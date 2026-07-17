<script setup lang="ts">
import { parseFetchError } from '~/utils/client-error'
import { USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'

definePageMeta({ layout: false })

const { t } = useI18n()
useHead(() => ({ title: t('auth.verifyEmail.title') }))

const route = useRoute()
const token = computed(() => (route.query.token || '').toString())
const user = computed(() => (route.query.user || '').toString())
const { fetchMe } = useAuth()

const status = ref<'pending' | 'success' | 'error'>('pending')
const message = ref(t('auth.verifyEmail.pendingMessage'))
const verifying = ref(false)
const alreadyVerified = ref(false)

const headerIcon = computed(() => {
  if (status.value === 'success') {
    return 'i-mdi-email-check-outline'
  }
  if (status.value === 'error') {
    return 'i-mdi-email-alert-outline'
  }
  return 'i-mdi-email-sync-outline'
})

const headerTitle = computed(() => {
  if (status.value === 'success') {
    return t('auth.verifyEmail.successTitle')
  }
  if (status.value === 'error') {
    return t('auth.verifyEmail.errorTitle')
  }
  return t('auth.verifyEmail.title')
})

const headerSubtitle = computed(() => {
  if (status.value === 'success') {
    return alreadyVerified.value ? t('auth.verifyEmail.alreadyVerified') : t('auth.verifyEmail.successSubtitle')
  }
  if (status.value === 'error') {
    return t('auth.verifyEmail.errorSubtitle')
  }
  return t('auth.verifyEmail.pendingSubtitle')
})

onMounted(async () => {
  if (verifying.value) {
    return
  }
  verifying.value = true

  if (!token.value || !user.value) {
    status.value = 'error'
    message.value = t('auth.verifyEmail.invalidLink')
    verifying.value = false
    return
  }

  status.value = 'pending'
  message.value = t('auth.verifyEmail.pendingMessage')

  try {
    const result = await $fetch<{ alreadyVerified?: boolean }>('/api/auth/verify-email', {
      query: { token: token.value, user: user.value }
    })
    status.value = 'success'
    if (result?.alreadyVerified) {
      alreadyVerified.value = true
      message.value = t('auth.verifyEmail.alreadyVerified')
      await new Promise(resolve => setTimeout(resolve, 3000))
      await navigateTo('/login')
    } else {
      message.value = t('auth.verifyEmail.successMessage')
      await fetchMe(true)
      await new Promise(resolve => setTimeout(resolve, 3000))
      await navigateTo(USER_OVERVIEW_PATH)
    }
  } catch (error: unknown) {
    status.value = 'error'
    message.value = parseFetchError(error, t('auth.verifyEmail.failed'))
  } finally {
    verifying.value = false
  }
})
</script>

<template>
  <CommonAppAuthShell>
    <div class="auth-brand">
      <div class="auth-brand__logo">
        <UIcon
          :name="headerIcon"
          class="size-6"
        />
      </div>
      <div>
        <h1 class="auth-brand__title">
          {{ headerTitle }}
        </h1>
        <p class="auth-brand__subtitle">
          {{ headerSubtitle }}
        </p>
      </div>
    </div>

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <div
        v-if="status === 'pending'"
        class="space-y-4"
      >
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon
            name="i-mdi-loading"
            class="size-4 animate-spin"
          />
          <span>{{ message }}</span>
        </div>
        <USkeleton class="h-10 w-full rounded-lg" />
        <USkeleton class="h-10 w-3/4 rounded-lg" />
      </div>

      <div
        v-else-if="status === 'success'"
        class="space-y-4 text-center"
      >
        <div class="auth-success-illustration">
          <UIcon
            name="i-mdi-check"
            class="size-11"
          />
        </div>
        <p class="text-sm text-muted">
          {{ message }}
        </p>
        <UButton
          :to="alreadyVerified ? '/login' : USER_OVERVIEW_PATH"
          block
          size="lg"
        >
          {{ alreadyVerified ? $t('auth.verifyEmail.login') : $t('auth.verifyEmail.enterDashboard') }}
        </UButton>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div class="auth-message auth-message--error">
          <UIcon
            name="i-mdi-alert-circle-outline"
            class="auth-message__icon size-4"
          />
          <span>{{ message }}</span>
        </div>
        <UButton
          to="/register"
          block
          size="lg"
          icon="i-mdi-account-plus-outline"
        >
          {{ $t('auth.verifyEmail.registerAgain') }}
        </UButton>
        <UButton
          to="/login"
          variant="outline"
          color="neutral"
          block
          size="lg"
          icon="i-mdi-login"
        >
          {{ $t('auth.verifyEmail.login') }}
        </UButton>
      </div>
    </UCard>

    <div class="auth-footer-links">
      <UButton
        variant="link"
        size="sm"
        to="/login"
        class="px-0"
      >
        {{ $t('auth.verifyEmail.login') }}
      </UButton>
      <span class="text-dimmed">·</span>
      <UButton
        variant="link"
        size="sm"
        to="/"
        class="px-0"
      >
        {{ $t('common.actions.backHome') }}
      </UButton>
    </div>
  </CommonAppAuthShell>
</template>
