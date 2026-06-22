<script setup lang="ts">
import { useAdminUserSessionSettings } from '~/composables/admin/useAdminSettingsPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const {
  form,
  saving,
  save,
  dirty,
  changedKeys,
  reset,
  allowRegistration,
  emailFilterModeItems,
  status,
  items,
  getForm,
  saveProvider,
  copyCallback
} = useAdminUserSessionSettings()
</script>

<template>
  <div class="space-y-8">
    <div>
      <UPageCard
        title="登录与注册"
        description="控制新用户注册、找回密码与注册邮箱校验策略。"
        variant="naked"
        class="mb-4"
      />

      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UFormField
          name="registrationMode"
          label="允许新用户注册"
          description="关闭后，前台注册入口与注册接口都会被拒绝（等同注册模式「关闭」）。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch v-model="allowRegistration" />
        </UFormField>
        <UFormField
          name="passwordResetEnabled"
          label="启用「忘记密码」功能"
          description="关闭后，登录页不再展示「忘记密码？」入口，重置邮件申请与重置接口也会被拒绝。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch v-model="form.passwordResetEnabled" />
        </UFormField>
        <UFormField
          name="emailActivationEnabled"
          label="邮件激活"
          description="开启后，新用户注册需点击邮件中的激活链接才能完成；关闭则注册即激活、不发验证邮件。请确认 邮件发信设置 正确，否则激活邮件无法送达。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch v-model="form.emailActivationEnabled" />
        </UFormField>
        <UFormField
          name="registerEmailFilterMode"
          label="注册邮箱过滤模式"
          description="不开启=任何邮箱都可注册；白名单=仅允许列表内域名注册；黑名单=拒绝列表内域名注册。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USelect
            v-model="form.registerEmailFilterMode"
            :items="emailFilterModeItems"
            class="min-w-40"
          />
        </UFormField>
        <UFormField
          name="registerEmailFilterList"
          label="邮箱域过滤规则"
          :description="form.registerEmailFilterMode === 'off'
            ? '当前模式为「不开启」，此列表不会生效。'
            : '逗号或换行分隔，仅写域名（不带 @）。例如：163.com, qq.com、gmail.com。'"
          class="flex max-sm:flex-col justify-between items-start gap-4"
          :ui="{ container: 'w-full' }"
        >
          <UTextarea
            v-model="form.registerEmailFilterList"
            :rows="5"
            autoresize
            :disabled="form.registerEmailFilterMode === 'off'"
            placeholder="163.com, qq.com&#10;gmail.com"
            class="w-full"
          />
        </UFormField>
      </UPageCard>
    </div>

    <div>
      <UPageCard
        title="用户会话时效"
        description="登录会话、邮箱验证与密码重置链接的有效期。"
        variant="naked"
        class="mb-4"
      />

      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UFormField
          name="sessionMaxAgeSeconds"
          label="默认会话有效期 (秒)"
          description="未勾选「记住我」时使用，默认 86400=1 天，期间活跃会自动滑动续期。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model.number="form.sessionMaxAgeSeconds"
            type="number"
            :min="1"
          />
        </UFormField>
        <UFormField
          name="sessionAbsoluteMaxAgeSeconds"
          label="会话绝对硬顶 (秒)"
          description="未勾选「记住我」时滑动续期的绝对上限，从首次登录算，默认 604800=7 天。到顶后强制重新登录。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model.number="form.sessionAbsoluteMaxAgeSeconds"
            type="number"
            :min="1"
          />
        </UFormField>
        <UFormField
          name="sessionRememberMaxAgeSeconds"
          label="「记住我」会话有效期 (秒)"
          description="勾选「记住我」时使用，默认 2592000=30 天，到期后必须重新登录。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model.number="form.sessionRememberMaxAgeSeconds"
            type="number"
            :min="1"
          />
        </UFormField>
        <UFormField
          name="emailVerifyExpiresInMinutes"
          label="邮箱验证过期 (分钟)"
          description="注册 / 换绑邮箱的验证链接有效时长，默认 30 分钟。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model.number="form.emailVerifyExpiresInMinutes"
            type="number"
            :min="1"
          />
        </UFormField>
        <UFormField
          name="passwordResetExpiresInMinutes"
          label="密码重置链接过期 (分钟)"
          description="找回密码邮件中的重置链接有效时长，默认 30 分钟。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <UInput
            v-model.number="form.passwordResetExpiresInMinutes"
            type="number"
            :min="1"
          />
        </UFormField>
      </UPageCard>
    </div>

    <div>
      <UPageCard
        title="第三方登录"
        description="各 provider 的应用配置与绑定策略。"
        variant="naked"
        class="mb-4"
      />

      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UFormField
          name="oauthForceBinding"
          label="强制绑定已有账号"
          description="开启后，第三方登录遇到未注册的身份只允许「绑定已有账号」，不允许新注册。"
          class="flex items-center justify-between not-last:pb-4 gap-2"
        >
          <USwitch v-model="form.oauthForceBinding" />
        </UFormField>
      </UPageCard>

      <div
        v-if="status === 'pending' && items.length === 0"
        class="mt-4 space-y-3"
      >
        <USkeleton
          v-for="i in 2"
          :key="i"
          class="h-16 w-full rounded-lg"
        />
      </div>
      <div
        v-else
        class="mt-4 space-y-3"
      >
        <UCollapsible
          v-for="item in items"
          :key="item.provider"
          v-model:open="getForm(item.provider).open"
          class="rounded-lg border border-default bg-default"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 p-4 text-left"
          >
            <UIcon
              :name="item.icon"
              class="text-2xl shrink-0"
            />
            <div class="flex flex-col min-w-0">
              <span class="font-medium truncate">{{ item.displayName }}</span>
              <span class="text-xs text-muted truncate">provider: {{ item.provider }}</span>
            </div>
            <UBadge
              class="ml-auto shrink-0"
              :color="item.isEnabled ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ item.isEnabled ? '已启用' : '未启用' }}
            </UBadge>
            <UIcon
              name="i-mdi-chevron-down"
              class="size-5 shrink-0 text-muted transition-transform duration-200"
              :class="getForm(item.provider).open ? 'rotate-180' : ''"
            />
          </button>

          <template #content>
            <div class="border-t border-default p-4 space-y-4">
              <UFormField label="Client ID">
                <UInput
                  v-model="getForm(item.provider).clientId"
                  placeholder="填写 OAuth App 的 Client ID"
                  icon="i-mdi-identifier"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Client Secret"
                :description="item.clientSecret ? '已保存。留空则保持不变，填写则覆盖。' : '首次保存，必填。'"
              >
                <UInput
                  v-model="getForm(item.provider).clientSecret"
                  :type="getForm(item.provider).secretVisible ? 'text' : 'password'"
                  placeholder="••••••••"
                  icon="i-mdi-key-variant"
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
                      :icon="getForm(item.provider).secretVisible ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'"
                      :aria-label="getForm(item.provider).secretVisible ? '隐藏密钥' : '显示密钥'"
                      @click="getForm(item.provider).secretVisible = !getForm(item.provider).secretVisible"
                    />
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Callback URL"
                description="由站点地址自动拼接，不可修改。请把该地址填到 OAuth App 的回调白名单。"
              >
                <div class="flex gap-2">
                  <UInput
                    :model-value="item.callbackUrl"
                    readonly
                    icon="i-mdi-link-variant"
                    class="flex-1"
                  />
                  <UButton
                    :icon="getForm(item.provider).copied ? 'i-mdi-check' : 'i-mdi-content-copy'"
                    :color="getForm(item.provider).copied ? 'success' : 'neutral'"
                    variant="outline"
                    @click="copyCallback(item)"
                  >
                    {{ getForm(item.provider).copied ? '已复制' : '复制' }}
                  </UButton>
                </div>
              </UFormField>
              <UFormField
                label="Scopes"
                description="已按 provider 固定，无需配置。"
              >
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="s in item.scopes"
                    :key="s"
                    variant="subtle"
                    color="neutral"
                  >
                    {{ s }}
                  </UBadge>
                  <span
                    v-if="!item.scopes.length"
                    class="text-xs text-muted"
                  >（无）</span>
                </div>
              </UFormField>

              <div class="flex items-center justify-between gap-2 pt-2 border-t border-default">
                <USwitch
                  v-model="getForm(item.provider).isEnabled"
                  label="启用该登录方式"
                />
                <UButton
                  icon="i-mdi-content-save-outline"
                  :loading="getForm(item.provider).saving"
                  @click="saveProvider(item)"
                >
                  保存
                </UButton>
              </div>
            </div>
          </template>
        </UCollapsible>
      </div>
    </div>

    <AdminStickySaveBar
      :dirty="dirty"
      :saving="saving"
      :changed-count="changedKeys.length"
      @save="save"
      @reset="reset"
    />
  </div>
</template>
