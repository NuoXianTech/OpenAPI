<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/client-error'
import { requiredMessage } from '#shared/schemas/validation'
import { ADMIN_OVERVIEW_PATH, USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'

useHead({ title: '管理员登录' })

definePageMeta({ layout: false })

const { fetchMe, user, adminLogin } = useAuth()
const { turnstile, settings } = useSiteSettings()

const schema = z.object({
  username: z.string().min(1, requiredMessage('用户名')),
  password: z.string().min(1, requiredMessage('密码'))
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  username: '',
  password: ''
})
const remember = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const turnstileError = ref('')
const passwordVisible = ref(false)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)
const turnstileRequired = computed(() => turnstile.value.adminLogin)
const checkingAuth = ref(true)

const ADMIN_LOGIN_ERROR_CODES: Record<number, string> = {
  401: '管理员账号或密码错误',
  403: '没有访问管理后台的权限',
  429: '尝试次数过多，请稍后再试',
  500: '服务器暂时无法响应，请稍后再试'
}

onMounted(async () => {
  await fetchMe()
  if (user.value) {
    await navigateTo(user.value.kind === 'admin' ? ADMIN_OVERVIEW_PATH : USER_OVERVIEW_PATH)
    return
  }
  checkingAuth.value = false
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMsg.value = ''
  turnstileError.value = ''

  if (turnstileRequired.value && !turnstileToken.value) {
    errorMsg.value = '请先完成人机验证'
    return
  }
  loading.value = true
  try {
    await adminLogin({
      username: event.data.username.trim(),
      password: event.data.password,
      remember: remember.value,
      turnstileToken: turnstileRequired.value ? turnstileToken.value : undefined
    })
    await navigateTo(ADMIN_OVERVIEW_PATH)
  } catch (err: unknown) {
    errorMsg.value = parseFetchError(err, '登录失败，请稍后再试', ADMIN_LOGIN_ERROR_CODES)
    turnstileWidget.value?.reset()
  } finally {
    loading.value = false
  }
}

function onTurnstileError(message: string) {
  turnstileError.value = message
}

function clearTurnstileError() {
  turnstileError.value = ''
}
</script>

<template>
  <CommonAppAuthShell>
    <div class="auth-brand">
      <div class="auth-brand__logo">
        <UIcon
          name="i-lucide-crown"
          class="size-6"
        />
      </div>
      <div>
        <h1 class="auth-brand__title">
          管理员登录
        </h1>
        <p class="auth-brand__subtitle">
          {{ settings.siteName }} · 控制台访问入口
        </p>
      </div>
    </div>

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <div
        v-if="checkingAuth"
        class="space-y-3"
      >
        <USkeleton class="h-11 w-full rounded-lg" />
        <USkeleton class="h-11 w-full rounded-lg" />
        <USkeleton class="h-11 w-full rounded-lg" />
      </div>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        action="javascript:void(0)"
        @submit="onSubmit"
      >
        <UFormField
          label="用户名"
          name="username"
          required
        >
          <UInput
            v-model="state.username"
            type="text"
            autocomplete="username"
            placeholder="admin"
            icon="i-lucide-user-key"
            size="lg"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          label="密码"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            :type="passwordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入管理员密码"
            icon="i-lucide-lock"
            size="lg"
            class="w-full"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                :icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                @click="() => { passwordVisible = !passwordVisible }"
              />
            </template>
          </UInput>
        </UFormField>

        <div class="-mt-1">
          <UCheckbox
            v-model="remember"
            label="记住我"
          />
        </div>

        <Transition name="state-fade">
          <div
            v-if="errorMsg"
            class="auth-message auth-message--error"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="auth-message__icon size-4"
            />
            <span>{{ errorMsg }}</span>
          </div>
        </Transition>

        <Transition name="state-fade">
          <div
            v-if="turnstileError"
            class="auth-message auth-message--error"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="auth-message__icon size-4"
            />
            <span>{{ turnstileError }}</span>
          </div>
        </Transition>

        <CommonTurnstileWidget
          v-if="turnstileRequired"
          ref="turnstileWidget"
          v-model:token="turnstileToken"
          :site-key="turnstile.siteKey"
          @verified="clearTurnstileError"
          @expired="clearTurnstileError"
          @error="onTurnstileError"
        />

        <UButton
          type="submit"
          block
          size="lg"
          :loading="loading"
          :disabled="turnstileRequired && !turnstileToken"
        >
          进入管理后台
        </UButton>
      </UForm>
    </UCard>

    <div class="auth-footer-links">
      <UButton
        variant="link"
        size="sm"
        to="/"
        class="px-0"
      >
        返回前台
      </UButton>
    </div>
  </CommonAppAuthShell>
</template>
