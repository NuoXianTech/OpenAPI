<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()

const { data, status, refresh } = await useFetch('/api/admin/settings/get', {
  default: () => ({ code: 0, msg: '', data: null }),
})

const form = reactive({
  siteName: '',
  siteUrl: '',
  siteImg: '',
  siteDescription: '',
  startTime: '',
  sessionMaxAgeSeconds: 604800,
  emailVerifyExpiresInMinutes: 30,
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
})

watch(() => data.value?.data, (val) => {
  if (val) {
    Object.assign(form, {
      siteName: val.siteName || '',
      siteUrl: val.siteUrl || '',
      siteImg: val.siteImg || '',
      siteDescription: val.siteDescription || '',
      startTime: val.startTime || '',
      sessionMaxAgeSeconds: val.sessionMaxAgeSeconds ?? 604800,
      emailVerifyExpiresInMinutes: val.emailVerifyExpiresInMinutes ?? 30,
      smtpHost: val.smtpHost || '',
      smtpPort: val.smtpPort ?? 465,
      smtpSecure: val.smtpSecure ?? true,
      smtpUser: val.smtpUser || '',
      smtpPass: val.smtpPass || '',
      smtpFrom: val.smtpFrom || '',
    })
  }
}, { immediate: true })

const saving = ref(false)

async function handleSave() {
  saving.value = true
  try {
    await $fetch('/api/admin/settings/update', { method: 'PUT', body: { ...form } })
    toast.add({ title: '保存成功', color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  }
  finally { saving.value = false }
}
</script>

<template>
  <UDashboardPanel id="admin-settings">
    <template #header>
      <UDashboardNavbar title="站点设置">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-content-save-outline"
            :loading="saving"
            @click="handleSave"
          >
            保存设置
          </UButton>
          <AdminHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
        <!-- Site Info -->
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center gap-2 px-1">
              <UIcon
                name="i-mdi-web"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                基本信息
              </h3>
            </div>
          </template>
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
        </UCard>

        <!-- Session -->
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center gap-2 px-1">
              <UIcon
                name="i-mdi-shield-lock-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                安全设置
              </h3>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="会话有效期 (秒)">
              <UInput
                v-model.number="form.sessionMaxAgeSeconds"
                type="number"
              />
            </UFormField>
            <UFormField label="邮箱验证过期 (分钟)">
              <UInput
                v-model.number="form.emailVerifyExpiresInMinutes"
                type="number"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- SMTP -->
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center gap-2 px-1">
              <UIcon
                name="i-mdi-email-outline"
                class="size-5 text-muted"
              />
              <h3 class="font-semibold">
                邮件配置 (SMTP)
              </h3>
            </div>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="SMTP 主机">
                <UInput
                  v-model="form.smtpHost"
                  placeholder="smtp.example.com"
                />
              </UFormField>
              <UFormField label="SMTP 端口">
                <UInput
                  v-model.number="form.smtpPort"
                  type="number"
                  placeholder="465"
                />
              </UFormField>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="SMTP 用户名">
                <UInput
                  v-model="form.smtpUser"
                  placeholder="user@example.com"
                />
              </UFormField>
              <UFormField label="SMTP 密码">
                <UInput
                  v-model="form.smtpPass"
                  type="password"
                  placeholder="••••••••"
                />
              </UFormField>
            </div>
            <UFormField label="发件人地址">
              <UInput
                v-model="form.smtpFrom"
                placeholder="no-reply@example.com"
              />
            </UFormField>
            <USwitch
              v-model="form.smtpSecure"
              label="使用 SSL/TLS"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
