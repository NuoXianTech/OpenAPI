<script setup lang="ts">
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const route = useRoute()
const toast = useToast()
const { user, fetchMe } = useAuth()

interface ProfileData {
  id: number
  username: string
  email: string
  displayName: string | null
  emailVerifiedAt: string | null
  createdAt: string
}

interface OauthBinding {
  provider: string
  displayName: string
  icon: string
  enabled: boolean
  bound: boolean
  nickname: string | null
  email: string | null
  avatarUrl: string | null
  providerUserId: string | null
  linkedAt: string | null
}

interface OauthListResp {
  code: number
  msg: string
  data: { oauthEnabled: boolean, providers: OauthBinding[] }
}

const profile = ref<ProfileData | null>(null)
const profileLoading = ref(false)

async function loadProfile() {
  profileLoading.value = true
  try {
    const res = await $fetch<{ data: ProfileData }>('/api/user/profile')
    profile.value = res.data
    profileForm.displayName = res.data.displayName || ''
  }
  catch (err) {
    console.error('failed to load profile', err)
  }
  finally {
    profileLoading.value = false
  }
}

// ========== 资料编辑（displayName） ==========
const profileForm = reactive({ displayName: '' })
const profileSaving = ref(false)

async function submitProfile() {
  profileSaving.value = true
  try {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: {
        displayName: profileForm.displayName.trim(),
      },
    })
    toast.add({ title: '资料已更新', color: 'success' })
    await loadProfile()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  }
  finally {
    profileSaving.value = false
  }
}

// ========== 修改密码 ==========
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)

async function submitPassword() {
  if (!passwordForm.currentPassword) {
    toast.add({ title: '请输入当前密码', color: 'warning' })
    return
  }
  if (passwordForm.newPassword.length < 8) {
    toast.add({ title: '新密码至少 8 位', color: 'warning' })
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.add({ title: '两次输入的新密码不一致', color: 'warning' })
    return
  }
  passwordSaving.value = true
  try {
    await $fetch('/api/user/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    })
    toast.add({
      title: '密码已更新',
      description: '其他设备的登录已被注销',
      color: 'success',
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '修改失败', color: 'error' })
  }
  finally {
    passwordSaving.value = false
  }
}

// ========== 修改邮箱 ==========
const emailForm = reactive({ newEmail: '' })
const emailSaving = ref(false)
const emailPending = ref<string | null>(null)

async function submitEmail() {
  const v = emailForm.newEmail.trim().toLowerCase()
  if (!v) {
    toast.add({ title: '请输入新邮箱', color: 'warning' })
    return
  }
  if (v === (profile.value?.email || '').toLowerCase()) {
    toast.add({ title: '新邮箱与当前邮箱相同', color: 'warning' })
    return
  }
  emailSaving.value = true
  try {
    const res = await $fetch<{ data: { pendingEmail: string } }>('/api/user/request-email-change', {
      method: 'POST',
      body: { newEmail: v },
    })
    emailPending.value = res.data.pendingEmail
    toast.add({
      title: '验证邮件已发送',
      description: `请到 ${res.data.pendingEmail} 邮箱点击确认链接完成更改`,
      color: 'success',
    })
    emailForm.newEmail = ''
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '发送失败', color: 'error' })
  }
  finally {
    emailSaving.value = false
  }
}

// ========== OAuth 绑定 ==========
const oauthList = ref<OauthBinding[]>([])
const oauthEnabled = ref(true)
const oauthLoading = ref(false)

async function loadOauth() {
  oauthLoading.value = true
  try {
    const res = await $fetch<OauthListResp>('/api/user/oauth/list')
    oauthEnabled.value = res.data.oauthEnabled
    oauthList.value = res.data.providers
  }
  catch (err) {
    console.error('failed to load oauth list', err)
    oauthList.value = []
  }
  finally {
    oauthLoading.value = false
  }
}

function startBind(provider: string) {
  // 跳转到 oauth start，mode=bind，returnTo 回到本页
  const returnTo = encodeURIComponent('/user/profile')
  window.location.href = `/api/auth/oauth/${provider}/start?mode=bind&returnTo=${returnTo}`
}

async function unbind(provider: string) {
  if (!confirm(`确认解绑 ${provider} 账号？解绑后将无法使用该方式登录。`)) return
  try {
    await $fetch(`/api/user/oauth/${provider}/unbind`, { method: 'POST' })
    toast.add({ title: '已解绑', color: 'success' })
    await loadOauth()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '解绑失败', color: 'error' })
  }
}

// ========== Mount ==========
const OAUTH_BIND_ERRORS: Record<string, string> = {
  state_mismatch: 'state 已失效，请重试',
  login_required: '需要先登录普通用户',
  already_bound_by_other: '该第三方账号已被其他用户绑定',
  callback_failed: '回调处理失败',
  provider_unavailable: 'provider 当前不可用',
  oauth_disabled: '站点已关闭第三方登录',
  secret_decrypt_failed: '密钥解密失败，请联系管理员',
  missing_code: '未收到授权 code',
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadOauth()])

  // 处理回调返回的 query 参数
  if (route.query.oauth_bound) {
    toast.add({
      title: `已绑定 ${route.query.oauth_bound}`,
      color: 'success',
    })
  }
  if (route.query.oauth_error) {
    const code = String(route.query.oauth_error)
    toast.add({
      title: '绑定失败',
      description: OAUTH_BIND_ERRORS[code] || code,
      color: 'error',
    })
  }
  // 同步刷新一下登录态（avatar 可能因 email 变更而需要刷新）
  void fetchMe()
})

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) }
  catch { return iso }
}
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
        <!-- 基本信息 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-account-circle-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                基本信息
              </h3>
            </div>
          </template>
          <div
            v-if="profileLoading && !profile"
            class="text-sm text-muted py-4 text-center"
          >
            加载中...
          </div>
          <div
            v-else
            class="space-y-4"
          >
            <div class="flex items-center gap-4">
              <img
                v-if="user?.avatarUrl"
                :src="user.avatarUrl"
                alt="avatar"
                class="size-16 rounded-full border border-default object-cover"
              >
              <div class="text-xs text-muted">
                头像由邮箱自动获取（Cravatar），修改邮箱后会同步更新
              </div>
            </div>

            <UFormField
              label="用户名"
              hint="用户名不可修改"
            >
              <UInput
                :model-value="profile?.username || ''"
                disabled
              />
            </UFormField>

            <UFormField label="显示名">
              <UInput
                v-model="profileForm.displayName"
                :maxlength="100"
                placeholder="对外展示的名字"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                :loading="profileSaving"
                @click="submitProfile"
              >
                保存资料
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- 邮箱 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-email-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                绑定邮箱
              </h3>
            </div>
          </template>
          <div class="space-y-3">
            <div class="rounded-lg border border-default bg-elevated/30 p-3 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-muted">当前邮箱</span>
                <span class="font-mono">{{ profile?.email }}</span>
                <UBadge
                  v-if="profile?.emailVerifiedAt"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  已验证
                </UBadge>
                <UBadge
                  v-else
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  未验证
                </UBadge>
              </div>
            </div>
            <div class="text-xs text-muted">
              修改邮箱将向新邮箱发送一封验证邮件，点击邮件中的链接后才会生效。
              更改邮箱后头像会自动跟随更新。
            </div>
            <div class="flex flex-wrap items-end gap-3">
              <UFormField
                label="新邮箱"
                class="flex-1 min-w-[260px]"
              >
                <UInput
                  v-model="emailForm.newEmail"
                  type="email"
                  placeholder="new@example.com"
                />
              </UFormField>
              <UButton
                icon="i-mdi-email-arrow-right-outline"
                :loading="emailSaving"
                @click="submitEmail"
              >
                发送验证
              </UButton>
            </div>
            <UAlert
              v-if="emailPending"
              color="info"
              variant="subtle"
              icon="i-mdi-email-fast-outline"
              :title="`已发送验证邮件到 ${emailPending}`"
              description="请到该邮箱点击确认链接以完成更改。链接的有效期由站点配置决定。"
            />
          </div>
        </UCard>

        <!-- 密码 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-lock-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                修改密码
              </h3>
            </div>
          </template>
          <div class="space-y-3">
            <UFormField label="当前密码">
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="••••••••"
              />
            </UFormField>
            <UFormField
              label="新密码"
              hint="至少 8 位"
            >
              <UInput
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="••••••••"
              />
            </UFormField>
            <UFormField label="确认新密码">
              <UInput
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="••••••••"
              />
            </UFormField>
            <UAlert
              color="warning"
              variant="soft"
              icon="i-mdi-alert-outline"
              title="修改密码后会注销所有其他设备"
              description="本次会话保留登录状态，其他终端的会话将立即失效。"
            />
            <div class="flex justify-end">
              <UButton
                :loading="passwordSaving"
                @click="submitPassword"
              >
                更新密码
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- OAuth 绑定 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-mdi-link-variant"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                第三方账号
              </h3>
              <UButton
                class="ml-auto"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-mdi-refresh"
                :loading="oauthLoading"
                @click="loadOauth"
              />
            </div>
          </template>
          <div
            v-if="!oauthEnabled && oauthList.length === 0"
            class="text-sm text-muted py-4 text-center"
          >
            站点已关闭第三方登录功能
          </div>
          <div
            v-else-if="oauthList.length === 0"
            class="text-sm text-muted py-4 text-center"
          >
            暂无可用的第三方登录提供方
          </div>
          <div
            v-else
            class="space-y-3"
          >
            <div
              v-for="item in oauthList"
              :key="item.provider"
              class="flex items-center gap-3 rounded-lg border border-default p-3 bg-elevated/30"
            >
              <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
                <UIcon
                  :name="item.icon"
                  class="size-6"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">
                    {{ item.displayName }}
                  </span>
                  <UBadge
                    v-if="item.bound"
                    color="success"
                    variant="subtle"
                    size="sm"
                  >
                    已绑定
                  </UBadge>
                  <UBadge
                    v-else-if="item.enabled"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    未绑定
                  </UBadge>
                  <UBadge
                    v-else
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    站点已关闭
                  </UBadge>
                </div>
                <div
                  v-if="item.bound"
                  class="text-xs text-muted truncate mt-0.5"
                >
                  {{ item.nickname || item.providerUserId }}
                  <span
                    v-if="item.email"
                    class="ml-1"
                  >· {{ item.email }}</span>
                  <span
                    v-if="item.linkedAt"
                    class="ml-1"
                  >· 绑定于 {{ formatDate(item.linkedAt) }}</span>
                </div>
              </div>
              <div class="shrink-0">
                <UButton
                  v-if="item.bound"
                  size="sm"
                  color="error"
                  variant="outline"
                  @click="unbind(item.provider)"
                >
                  解绑
                </UButton>
                <UButton
                  v-else-if="item.enabled"
                  size="sm"
                  variant="outline"
                  @click="startBind(item.provider)"
                >
                  绑定
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
