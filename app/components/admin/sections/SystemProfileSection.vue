<script setup lang="ts">
import { useSiteSettings } from '~/composables/useSiteSettings'
import { adminSystemHref } from '~/constants/admin-sections/system'

const { user } = useAuth()
const { settings } = useSiteSettings()
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <DashboardPageHeader
      icon="i-mdi-shield-crown-outline"
      title="管理员账户"
      description="此账户通过服务器环境变量配置，无法在界面修改用户名或密码。"
    />

    <DashboardSettingsSection
      icon="i-mdi-account-circle-outline"
      title="身份"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="用户名">
          <UInput
            :model-value="user?.username || '-'"
            disabled
          />
        </UFormField>
        <UFormField label="邮箱">
          <UInput
            :model-value="user?.email || '-'"
            disabled
          />
        </UFormField>
      </div>
      <p class="mt-3 text-xs text-muted">
        如需修改，请编辑服务器
        <code class="font-mono px-1 rounded bg-elevated">.env</code>
        中的
        <code class="font-mono px-1 rounded bg-elevated">ADMIN_USERNAME</code>、<code class="font-mono px-1 rounded bg-elevated">ADMIN_EMAIL</code>
        与
        <code class="font-mono px-1 rounded bg-elevated">ADMIN_PASSWORD</code>
        后重启服务。
      </p>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      icon="i-mdi-web"
      title="站点信息"
      description="只读快照；如需修改请前往站点设置标签页。"
    >
      <div class="space-y-2 text-sm">
        <div class="flex items-baseline justify-between">
          <span class="text-muted">站点名称</span>
          <span class="font-medium">{{ settings?.siteName || '-' }}</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-muted">站点 URL</span>
          <span class="font-mono text-xs">{{ settings?.siteUrl || '-' }}</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-muted">启动时间</span>
          <span class="font-mono text-xs">{{ settings?.startTime || '-' }}</span>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <UButton
            :to="adminSystemHref('settings')"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-mdi-cog-outline"
          >
            站点设置
          </UButton>
          <UButton
            to="/admin"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-mdi-view-dashboard-outline"
          >
            返回仪表盘
          </UButton>
        </div>
      </template>
    </DashboardSettingsSection>
  </div>
</template>
