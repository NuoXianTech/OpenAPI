<script setup lang="ts">
import type { ConfirmEmailChangeInput } from '#shared/schemas/auth'
import { parseFetchError } from '~/utils/client-error'

useHead({ title: '确认邮箱变更' })

definePageMeta({ layout: false })

const route = useRoute()
const { fetchMe } = useAuth()

const userId = computed(() => Number((route.query.user || '').toString()) || 0)
const token = computed(() => (route.query.token || '').toString())
const linkValid = computed(() => userId.value > 0 && token.value.length > 0)

const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const newEmail = ref('')

const headerSubtitle = computed(() => {
  if (status.value === 'success') {
    return '邮箱已更新，可继续使用账号'
  }
  if (status.value === 'error') {
    return '确认链接可能已失效，请重新发起变更'
  }
  return '点击下方按钮完成邮箱变更'
})

async function onConfirm() {
  if (status.value === 'submitting') return
  errorMessage.value = ''
  status.value = 'submitting'
  try {
    const result = await $fetch<{ email: string }>('/api/auth/confirm-email-change', {
      method: 'POST',
      body: {
        userId: userId.value,
        token: token.value
      } satisfies ConfirmEmailChangeInput
    })
    newEmail.value = result.email
    status.value = 'success'
    // 当前会话用户邮箱可能已变更，刷新登录态
    void fetchMe(true)
  } catch (error: unknown) {
    status.value = 'error'
    errorMessage.value = parseFetchError(error, '确认失败，链接可能已失效')
  }
}
</script>

<template>
  <CommonAppAuthShell>
    <AuthBrandHeader
      icon="i-lucide-refresh-cw"
      title="确认邮箱变更"
      :subtitle="headerSubtitle"
    />

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <div
        v-if="!linkValid"
        class="space-y-4"
      >
        <div class="auth-message auth-message--error">
          <UIcon
            name="i-lucide-unlink"
            class="auth-message__icon size-4"
          />
          <span>确认链接无效或已损坏，请重新发起变更。</span>
        </div>
        <UButton
          to="/user/settings"
          block
          size="lg"
          icon="i-lucide-user-round-cog"
        >
          返回账号设置
        </UButton>
      </div>

      <div
        v-else-if="status === 'success'"
        class="space-y-4 text-center"
      >
        <div class="auth-success-illustration">
          <UIcon
            name="i-lucide-check"
            class="size-11"
          />
        </div>
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            邮箱已更新
          </h3>
          <p class="text-sm text-muted mt-1.5">
            当前邮箱：{{ newEmail }}
          </p>
        </div>
        <UButton
          to="/user/settings"
          block
          size="lg"
        >
          返回账号设置
        </UButton>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <p class="text-sm text-muted">
          请点击下方按钮确认本次邮箱变更。确认后旧邮箱将立即失效，新邮箱开始接收账号相关通知。
        </p>
        <Transition name="state-fade">
          <div
            v-if="errorMessage"
            class="auth-message auth-message--error"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="auth-message__icon size-4"
            />
            <span>{{ errorMessage }}</span>
          </div>
        </Transition>
        <UButton
          :loading="status === 'submitting'"
          :disabled="status === 'submitting'"
          block
          size="lg"
          icon="i-lucide-mail-check"
          @click="onConfirm"
        >
          确认变更
        </UButton>
      </div>
    </UCard>

    <AuthFooterLinks
      :links="[
        { label: '返回登录', to: '/login' },
        { label: '返回首页', to: '/' }
      ]"
    />
  </CommonAppAuthShell>
</template>
