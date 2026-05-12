<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'

const form = useAdminSettingsForm()
</script>

<template>
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
      <UFormField
        label="默认会话有效期 (秒)"
        help="未勾选「记住我」时使用，默认 86400=1 天，期间活跃会自动滑动续期。"
      >
        <UInput
          v-model.number="form.sessionMaxAgeSeconds"
          type="number"
        />
      </UFormField>
      <UFormField
        label="会话绝对硬顶 (秒)"
        help="未勾选「记住我」时滑动续期的绝对上限，从首次登录算，默认 604800=7 天。到顶后无论是否活跃都强制重新登录。"
      >
        <UInput
          v-model.number="form.sessionAbsoluteMaxAgeSeconds"
          type="number"
        />
      </UFormField>
      <UFormField
        label="「记住我」会话有效期 (秒)"
        help="勾选「记住我」时使用，默认 2592000=30 天，到期后必须重新登录。"
      >
        <UInput
          v-model.number="form.sessionRememberMaxAgeSeconds"
          type="number"
        />
      </UFormField>
      <UFormField label="邮箱验证过期 (分钟)">
        <UInput
          v-model.number="form.emailVerifyExpiresInMinutes"
          type="number"
        />
      </UFormField>
      <UFormField label="密码重置链接过期 (分钟)">
        <UInput
          v-model.number="form.passwordResetExpiresInMinutes"
          type="number"
        />
      </UFormField>
    </div>
    <div class="flex flex-col gap-1 pt-4 border-t border-default mt-4">
      <USwitch
        v-model="form.passwordResetEnabled"
        label="启用「忘记密码」功能"
      />
      <p class="text-xs text-muted">
        关闭后，登录页不再展示「忘记密码？」入口，重置邮件申请与重置接口也会被拒绝。
      </p>
    </div>
    <div class="flex flex-col gap-3 pt-4 border-t border-default mt-4">
      <UFormField
        label="注册邮箱过滤模式"
        help="不开启=任何邮箱都可注册；白名单=仅允许列表内域名注册；黑名单=拒绝列表内域名注册。"
      >
        <URadioGroup
          v-model="form.registerEmailFilterMode"
          orientation="horizontal"
          :items="[
            { label: '不开启', value: 'off' },
            { label: '白名单', value: 'whitelist' },
            { label: '黑名单', value: 'blacklist' },
          ]"
        />
      </UFormField>
      <UFormField
        label="邮箱域名列表"
        :help="form.registerEmailFilterMode === 'off'
          ? '当前模式为「不开启」，此列表不会生效。'
          : '逗号或换行分隔，仅写域名（不带 @）。例如：163.com, qq.com、gmail.com。# 开头为注释。'"
      >
        <UTextarea
          v-model="form.registerEmailFilterList"
          :rows="4"
          :disabled="form.registerEmailFilterMode === 'off'"
          placeholder="163.com, qq.com&#10;gmail.com"
        />
      </UFormField>
    </div>
  </UCard>
</template>
