<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'

const form = useAdminSettingsForm()
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-2 px-1">
        <UIcon
          name="i-mdi-shield-account-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          备案与法务
        </h3>
      </div>
    </template>
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="ICP 备案号"
          help="留空则页脚不展示。填写后展示在页脚，点击跳转工信部备案系统。"
        >
          <UInput
            v-model="form.icpBeian"
            placeholder="京ICP备00000000号"
          />
        </UFormField>
        <UFormField
          label="公安备案号"
          help="留空则页脚不展示。填写后展示在页脚，点击跳转公安备案系统。"
        >
          <UInput
            v-model="form.policeBeian"
            placeholder="京公网安备00000000000000号"
          />
        </UFormField>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="服务条款链接"
          help="留空则不展示。填写后展示在登录 / 注册页，可填完整 URL 或站内路径。"
        >
          <UInput
            v-model="form.termsUrl"
            placeholder="https://example.com/terms"
          />
        </UFormField>
        <UFormField
          label="隐私政策链接"
          help="留空则不展示。填写后展示在登录 / 注册页，可填完整 URL 或站内路径。"
        >
          <UInput
            v-model="form.privacyUrl"
            placeholder="https://example.com/privacy"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
