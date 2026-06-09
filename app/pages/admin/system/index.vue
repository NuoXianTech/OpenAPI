<script setup lang="ts">
import { useAdminSettingsPage } from '~/composables/admin/useAdminSettingsPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { form, saving, save, dirty, changedKeys, reset } = useAdminSettingsPage()

const cooldownItems = [
  { label: '按小时冷却', value: 'hours' },
  { label: '每日固定时间刷新', value: 'fixed_time' }
]

const modeItems = [
  { label: '固定积分', value: 'fixed' },
  { label: '区间随机', value: 'range' }
]

// 区间随机时最小值不能大于最大值
const minMaxInvalid = computed(() => {
  if (form.checkinMode !== 'range') return false
  return form.checkinAmountMin > form.checkinAmountMax
})

// 固定时间刷新需符合 HH:mm
const fixedTimeInvalid = computed(() => {
  if (form.checkinCooldownMode !== 'fixed_time') return false
  return !/^([01]?\d|2[0-3]):[0-5]\d$/.test(form.checkinFixedRefreshTime || '')
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <UPageCard
        title="基本信息"
        description="站点的对外展示信息，会显示在前台页面、页脚与登录注册页。"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />

      <UPageCard variant="subtle">
        <UFormField
          name="siteName"
          label="站点名称"
          description="展示在浏览器标题、登录注册页与邮件中的站点名。"
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.siteName"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="siteDescription"
          label="站点描述"
          description="站点描述信息，站点描述将显示在网页代码的头部与首页卡片中。"
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
          :ui="{ container: 'w-full' }"
        >
          <UTextarea
            v-model="form.siteDescription"
            :rows="5"
            autoresize
            class="w-full"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="siteUrl"
          label="站点 URL"
          description="站点对外访问地址，用于拼接邮件链接与 OAuth 回调，须以 http:// 或 https:// 开头。"
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.siteUrl"
            placeholder="https://example.com"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="siteImg"
          label="站点图标"
          description="浏览器标签页与站点 Logo 使用的图标地址。"
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.siteImg"
            placeholder="/favicon.ico"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="startTime"
          label="运行时间"
          description="站点上线时间，用于前台展示已稳定运行的天数。"
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.startTime"
            type="datetime-local"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="termsUrl"
          label="使用条款链接"
          description="留空则不展示。填写后展示在登录 / 注册页，可填完整 URL 或站内路径。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.termsUrl"
            placeholder="https://example.com/terms"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="privacyUrl"
          label="隐私政策链接"
          description="留空则不展示。填写后展示在登录 / 注册页，可填完整 URL 或站内路径。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.privacyUrl"
            placeholder="https://example.com/privacy"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="icpBeian"
          label="ICP 备案号"
          description="留空则页脚不展示。填写后展示在页脚，点击跳转工信部备案系统。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.icpBeian"
            placeholder="京ICP备00000000号"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="policeBeian"
          label="公安备案号"
          description="留空则页脚不展示。填写后展示在页脚，点击跳转公安备案系统。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.policeBeian"
            placeholder="京公网安备00000000000000号"
            autocomplete="off"
          />
        </UFormField>
      </UPageCard>
    </div>

    <div>
      <UPageCard
        title="每日签到"
        description="控制用户后台积分页的每日签到功能与奖励发放规则。"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />

      <UPageCard variant="subtle">
        <UFormField
          name="checkinEnabled"
          label="启用每日签到"
          description="关闭后用户积分页的签到按钮会显示「已关闭」，签到接口也会拒绝请求。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <USwitch v-model="form.checkinEnabled" />
        </UFormField>
        <USeparator />
        <UFormField
          name="checkinCooldownMode"
          label="冷却方式"
          description="按小时 = 距上次签到 N 小时后可签；每日固定时间 = 到达设定时刻后刷新可签状态。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <USelect
            v-model="form.checkinCooldownMode"
            :items="cooldownItems"
            :disabled="!form.checkinEnabled"
            class="min-w-48"
          />
        </UFormField>
        <USeparator />
        <UFormField
          v-if="form.checkinCooldownMode === 'hours'"
          name="checkinRefreshHours"
          label="冷却间隔（小时）"
          description="两次签到的最小间隔，默认 24 小时。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model.number="form.checkinRefreshHours"
            type="number"
            :min="1"
            :disabled="!form.checkinEnabled"
          />
        </UFormField>
        <UFormField
          v-else
          name="checkinFixedRefreshTime"
          label="刷新时间（HH:mm）"
          description="每天到达该时刻后可再次签到，例如 00:00 表示每日 0 点刷新。"
          :error="fixedTimeInvalid ? '请按 HH:mm 格式填写，例如 00:00' : undefined"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="form.checkinFixedRefreshTime"
            type="time"
            :disabled="!form.checkinEnabled"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="checkinMode"
          label="奖励模式"
          description="固定 = 每次签到固定积分；区间随机 = 在 [最少, 最多] 之间随机取整。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <USelect
            v-model="form.checkinMode"
            :items="modeItems"
            :disabled="!form.checkinEnabled"
            class="min-w-48"
          />
        </UFormField>
        <USeparator />
        <UFormField
          v-if="form.checkinMode === 'fixed'"
          name="checkinAmountFixed"
          label="固定奖励积分"
          description="每次签到固定发放的积分数量。"
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model.number="form.checkinAmountFixed"
            type="number"
            :min="0"
            :disabled="!form.checkinEnabled"
          />
        </UFormField>
        <template v-else>
          <UFormField
            name="checkinAmountMin"
            label="最少积分"
            description="区间随机的下限。"
            :error="minMaxInvalid ? '最少积分必须 ≤ 最多积分' : undefined"
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput
              v-model.number="form.checkinAmountMin"
              type="number"
              :min="0"
              :disabled="!form.checkinEnabled"
            />
          </UFormField>
          <USeparator />
          <UFormField
            name="checkinAmountMax"
            label="最多积分"
            description="区间随机的上限。"
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput
              v-model.number="form.checkinAmountMax"
              type="number"
              :min="0"
              :disabled="!form.checkinEnabled"
            />
          </UFormField>
        </template>
      </UPageCard>
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
