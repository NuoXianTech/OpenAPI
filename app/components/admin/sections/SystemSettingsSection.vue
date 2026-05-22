<script setup lang="ts">
import { useAdminSettingsPage } from '~/composables/admin/useAdminSettingsPage'
import { adminContentHref } from '~/constants/admin-sections/content'

const { form, saving, status, save } = useAdminSettingsPage()
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end">
      <UButton
        icon="i-mdi-content-save-outline"
        :loading="saving"
        @click="save"
      >
        保存设置
      </UButton>
    </div>

    <div
      v-if="status === 'pending'"
      class="text-center text-sm text-muted py-8"
    >
      加载中...
    </div>

    <div
      v-else
      class="max-w-3xl space-y-8"
    >
      <UPageCard
        icon="i-mdi-web"
        title="基本信息"
      >
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="站点名称">
              <UInput
                v-model="form.siteName"
                placeholder="OpenAPI"
              />
            </UFormField>
            <UFormField label="站点 URL">
              <UInput
                v-model="form.siteUrl"
                placeholder="https://example.com"
              />
            </UFormField>
          </div>
          <UFormField label="站点图标 URL">
            <UInput
              v-model="form.siteImg"
              placeholder="https://example.com/logo.png"
            />
          </UFormField>
          <UFormField label="站点描述">
            <UTextarea
              v-model="form.siteDescription"
              :rows="3"
            />
          </UFormField>
          <UFormField label="启动时间">
            <UInput
              v-model="form.startTime"
              placeholder="2026-01-01 00:00:00"
            />
          </UFormField>
        </div>
      </UPageCard>

      <AdminSettingsSecurityCard />

      <UPageCard
        icon="i-mdi-shield-key-outline"
        title="第三方登录开关"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-1">
            <USwitch
              v-model="form.oauthLoginEnabled"
              label="启用第三方登录"
            />
            <p class="text-xs text-muted">
              关闭后，登录页不会显示 GitHub/QQ 等第三方入口，回调接口也将拒绝请求。
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <USwitch
              v-model="form.oauthForceBinding"
              :disabled="!form.oauthLoginEnabled"
              label="强制绑定已有账号"
            />
            <p class="text-xs text-muted">
              开启后，第三方登录不会自动创建新用户；只能通过已绑定或邮箱命中的本站账号登录。
            </p>
          </div>
          <p class="text-xs text-muted">
            各 provider 的 Client ID/Secret 请在「第三方登录」标签页内逐项配置。
          </p>
        </div>
      </UPageCard>

      <AdminSettingsTurnstileCard />

      <UPageCard
        icon="i-mdi-bullhorn-outline"
        title="公告"
      >
        <div class="space-y-4">
          <p class="text-xs text-muted">
            开启后，访客首次进入网站首页会弹出当前生效的公告（最新一条默认展开，旧公告收起）。
            管理后台已通过顶部铃铛常驻入口展示公告，无需额外开关。
            公告内容请前往
            <NuxtLink
              :to="adminContentHref('announcements')"
              class="text-primary underline"
            >
              公告管理
            </NuxtLink>
            标签页维护。
          </p>
          <USwitch
            v-model="form.announcementShowOnHome"
            label="在网站首页弹出公告"
          />
        </div>
      </UPageCard>

      <AdminSettingsSmtpCard />
    </div>
  </div>
</template>
