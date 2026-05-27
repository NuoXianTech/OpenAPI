<script setup lang="ts">
import { useAdminSettingsForm } from '~/composables/admin/useAdminSettingsPage'

const form = useAdminSettingsForm()

const modeItems = [
  { label: '固定积分', value: 'fixed' },
  { label: '区间随机', value: 'range' }
]

const cooldownItems = [
  { label: '按小时冷却', value: 'hours' },
  { label: '每日固定时间刷新', value: 'fixed_time' }
]

const minMaxInvalid = computed(() => {
  if (form.checkinMode !== 'range') return false
  return form.checkinAmountMin > form.checkinAmountMax
})

const fixedTimeInvalid = computed(() => {
  if (form.checkinCooldownMode !== 'fixed_time') return false
  return !/^([01]?\d|2[0-3]):[0-5]\d$/.test(form.checkinFixedRefreshTime || '')
})
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-2 px-1">
        <UIcon
          name="i-mdi-calendar-check-outline"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          每日签到
        </h3>
      </div>
    </template>

    <div class="flex flex-col gap-1">
      <USwitch
        v-model="form.checkinEnabled"
        label="启用每日签到"
      />
      <p class="text-xs text-muted">
        关闭后用户后台积分页的签到按钮会显示「已关闭」，签到接口也会拒绝请求。
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <UFormField
        label="冷却方式"
        help="按小时 = 距上次签到 N 小时后可签；每日固定时间 = 例如每日 00:00 自动刷新可签状态。"
      >
        <URadioGroup
          v-model="form.checkinCooldownMode"
          orientation="horizontal"
          :items="cooldownItems"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
      <UFormField
        v-if="form.checkinCooldownMode === 'hours'"
        label="冷却小时"
        help="两次签到的最小间隔，默认 24 小时。"
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
        label="刷新时间 (HH:mm)"
        help="每天到达该时刻后可再次签到，例如 00:00 表示每日 0 点刷新。"
        :error="fixedTimeInvalid ? '请按 HH:mm 格式填写，例如 00:00' : undefined"
      >
        <UInput
          v-model="form.checkinFixedRefreshTime"
          type="time"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <UFormField
        label="奖励模式"
        help="固定 = 每次签到固定积分；区间随机 = 在 [最小, 最大] 之间随机取整。"
      >
        <URadioGroup
          v-model="form.checkinMode"
          orientation="horizontal"
          :items="modeItems"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
      <UFormField
        v-if="form.checkinMode === 'fixed'"
        label="固定奖励积分"
        help="每次签到固定发放的积分数量。"
      >
        <UInput
          v-model.number="form.checkinAmountFixed"
          type="number"
          :min="0"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
    </div>

    <div
      v-if="form.checkinMode === 'range'"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"
    >
      <UFormField
        label="最少积分"
        :error="minMaxInvalid ? '最少积分必须 ≤ 最多积分' : undefined"
      >
        <UInput
          v-model.number="form.checkinAmountMin"
          type="number"
          :min="0"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
      <UFormField label="最多积分">
        <UInput
          v-model.number="form.checkinAmountMax"
          type="number"
          :min="0"
          :disabled="!form.checkinEnabled"
        />
      </UFormField>
    </div>

    <div class="flex flex-col gap-1 pt-4 border-t border-default mt-4">
      <USwitch
        v-model="form.turnstileCheckinEnabled"
        :disabled="!form.checkinEnabled || !form.turnstileEnabled"
        label="签到前需要 Turnstile 人机验证"
      />
      <p class="text-xs text-muted">
        开启后，用户点击签到会弹出 Cloudflare Turnstile 验证窗口，通过后自动签到。需先在「Turnstile 人机验证」卡片中完成总开关与密钥配置。
      </p>
    </div>
  </UCard>
</template>
