<script setup lang="ts">
import { z } from 'zod'
import { oauthBindSchema, oauthRegisterSchema } from '#shared/schemas/auth'
import { parseFetchError } from '#shared/utils/client-error'
import { USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'

definePageMeta({ layout: false })
useHead({ title: '完成第三方登录' })

interface PendingInfo {
  pending: boolean
  provider?: string
  displayName?: string
  icon?: string
  nickname?: string | null
  avatarUrl?: string | null
  email?: string | null
  suggestedUsername?: string
  emailHasAccount?: boolean
  allowRegister?: boolean
}

const toast = useToast()

const loading = ref(true)
const info = ref<PendingInfo | null>(null)
const mode = ref<'bind' | 'register'>('bind')
const submitting = ref(false)

const bindState = reactive({ identifier: '', password: '' })
const registerState = reactive({ email: '', username: '', password: '', confirmPassword: '' })

// 注册成功且需邮箱激活后，切换到「去邮箱激活」提示面板
const emailSent = ref(false)
const sentToEmail = ref('')

const ready = computed(() => Boolean(info.value?.pending))
const allowRegister = computed(() => Boolean(info.value?.allowRegister))

// 复用服务端 schema 做客户端校验，额外加「确认密码」一致性校验
const registerFormSchema = oauthRegisterSchema
  .omit({ turnstileToken: true })
  .extend({ confirmPassword: z.string().min(1, '请再次输入密码') })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致'
  })

onMounted(async () => {
  try {
    const data = await $fetch<PendingInfo>('/api/auth/oauth/pending')
    info.value = data
    if (data.pending) {
      registerState.email = data.email || ''
      registerState.username = data.suggestedUsername || ''
    }
  } catch {
    info.value = { pending: false }
  } finally {
    loading.value = false
  }
})

async function submitBind() {
  submitting.value = true
  try {
    await $fetch('/api/auth/oauth/bind', {
      method: 'POST',
      body: { identifier: bindState.identifier, password: bindState.password }
    })
    await navigateTo(USER_OVERVIEW_PATH)
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, '绑定失败'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function submitRegister() {
  submitting.value = true
  try {
    const res = await $fetch<{ ok: boolean, verificationRequired: boolean }>('/api/auth/oauth/register', {
      method: 'POST',
      body: {
        email: registerState.email,
        username: registerState.username || undefined,
        password: registerState.password
      }
    })
    if (res.verificationRequired) {
      // 账号已创建并绑定该第三方身份，待邮箱激活；激活链接由 verify-email 自动登录后进用户中心
      sentToEmail.value = registerState.email
      emailSent.value = true
    } else {
      toast.add({ title: '注册成功', color: 'success' })
      await navigateTo(USER_OVERVIEW_PATH)
    }
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, '注册失败'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <CommonAppAuthShell>
    <AuthBrandHeader
      icon="i-lucide-link"
      title="完成第三方登录"
      subtitle="该第三方账号还未关联本站用户，请选择绑定已有账号或新注册"
    />

    <UCard
      variant="outline"
      class="auth-card"
      :ui="{ body: 'p-6 sm:p-7' }"
    >
      <!-- 加载中 -->
      <div
        v-if="loading"
        class="space-y-3"
      >
        <USkeleton class="h-16 w-full rounded-lg" />
        <USkeleton class="h-11 w-full rounded-lg" />
        <USkeleton class="h-11 w-full rounded-lg" />
      </div>

      <!-- 会话失效 / 无待处理身份 -->
      <div
        v-else-if="!ready"
        class="space-y-4 text-center"
      >
        <UIcon
          name="i-lucide-hourglass"
          class="mx-auto size-10 text-muted"
        />
        <p class="text-sm text-muted">
          绑定会话已过期或无效，请重新发起第三方登录。
        </p>
        <UButton
          block
          size="lg"
          to="/login"
        >
          返回登录
        </UButton>
      </div>

      <!-- 新注册成功 → 去邮箱激活提示 -->
      <div
        v-else-if="emailSent"
        class="space-y-4 text-center"
      >
        <div class="auth-success-illustration">
          <UIcon
            name="i-lucide-send"
            class="size-11"
          />
        </div>
        <div class="space-y-1">
          <p class="font-medium">
            验证邮件已发送
          </p>
          <p class="text-sm text-muted">
            已向 <span class="font-medium text-default">{{ sentToEmail }}</span> 发送激活邮件。
            请点击邮件中的链接完成激活，激活后将自动登录并进入用户中心。
          </p>
        </div>
        <UButton
          block
          size="lg"
          variant="outline"
          color="neutral"
          to="/login"
        >
          返回登录
        </UButton>
      </div>

      <!-- 待处理身份 -->
      <div
        v-else
        class="space-y-5"
      >
        <!-- 三方身份卡 -->
        <div class="flex items-center gap-3 rounded-lg border border-default bg-elevated/40 p-3">
          <UAvatar
            :src="info?.avatarUrl || undefined"
            :icon="info?.icon || 'i-lucide-circle-user-round'"
            size="lg"
          />
          <div class="min-w-0">
            <p class="truncate font-medium">
              {{ info?.nickname || info?.displayName }}
            </p>
            <p class="truncate text-xs text-muted">
              来自 {{ info?.displayName }}{{ info?.email ? ` · ${info?.email}` : '' }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="info?.emailHasAccount"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="检测到该邮箱已注册"
          description="建议直接「绑定已有账号」，把这个第三方登录方式关联到你的现有账号。"
        />

        <!-- 模式切换（仅在允许新注册时显示） -->
        <div
          v-if="allowRegister"
          class="grid grid-cols-2 gap-2"
        >
          <UButton
            :variant="mode === 'bind' ? 'solid' : 'outline'"
            :color="mode === 'bind' ? 'primary' : 'neutral'"
            block
            @click="() => { mode = 'bind' }"
          >
            绑定已有账号
          </UButton>
          <UButton
            :variant="mode === 'register' ? 'solid' : 'outline'"
            :color="mode === 'register' ? 'primary' : 'neutral'"
            block
            @click="() => { mode = 'register' }"
          >
            新注册
          </UButton>
        </div>

        <!-- 绑定已有账号 -->
        <UForm
          v-if="mode === 'bind'"
          :schema="oauthBindSchema"
          :state="bindState"
          class="space-y-4"
          @submit="submitBind"
        >
          <UFormField
            name="identifier"
            label="邮箱或用户名"
          >
            <UInput
              v-model="bindState.identifier"
              placeholder="you@example.com"
              icon="i-lucide-user"
              size="lg"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="password"
            label="密码"
          >
            <UInput
              v-model="bindState.password"
              type="password"
              placeholder="请输入登录密码"
              icon="i-lucide-lock"
              size="lg"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            block
            size="lg"
            :loading="submitting"
          >
            验证并绑定
          </UButton>
        </UForm>

        <!-- 新注册 -->
        <UForm
          v-else
          :schema="registerFormSchema"
          :state="registerState"
          class="space-y-4"
          @submit="submitRegister"
        >
          <UFormField
            name="email"
            label="邮箱"
            :description="info?.email ? '已从第三方资料预填，可修改。' : '该第三方未提供邮箱，请填写你的常用邮箱。'"
          >
            <UInput
              v-model="registerState.email"
              type="email"
              placeholder="you@example.com"
              icon="i-lucide-mail"
              size="lg"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="username"
            label="用户名"
            description="留空将自动生成，可自定义（字母、数字、下划线、短横线）。"
          >
            <UInput
              v-model="registerState.username"
              placeholder="留空自动生成"
              icon="i-lucide-user"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="password"
            label="密码"
          >
            <UInput
              v-model="registerState.password"
              type="password"
              placeholder="设置不少于 8 位的登录密码"
              icon="i-lucide-lock"
              size="lg"
              autocomplete="new-password"
              class="w-full"
            />
            <AuthPasswordStrength :password="registerState.password" />
          </UFormField>
          <UFormField
            name="confirmPassword"
            label="确认密码"
          >
            <UInput
              v-model="registerState.confirmPassword"
              type="password"
              placeholder="再次输入密码"
              icon="i-lucide-lock-keyhole"
              size="lg"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            block
            size="lg"
            :loading="submitting"
          >
            创建账号
          </UButton>
        </UForm>
      </div>
    </UCard>

    <AuthFooterLinks
      prefix="不是你？"
      :links="[
        { label: '返回登录', to: '/login' },
        { label: '返回首页', to: '/' }
      ]"
    />
  </CommonAppAuthShell>
</template>
