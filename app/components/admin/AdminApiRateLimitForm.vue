<script setup lang="ts">
import { useAdminApiForm } from '~/composables/admin/useAdminApiForm'

const state = useAdminApiForm()
</script>

<template>
  <div class="border-t border-default pt-3 mt-3">
    <div class="text-sm font-medium mb-2">
      限流（0 = 不限）
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField
        label="每秒"
        name="rateLimitPerSecond"
      >
        <UInput
          v-model.number="state.rateLimitPerSecond"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        label="每分钟"
        name="rateLimitPerMinute"
      >
        <UInput
          v-model.number="state.rateLimitPerMinute"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        label="每小时"
        name="rateLimitPerHour"
      >
        <UInput
          v-model.number="state.rateLimitPerHour"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        label="每天"
        name="rateLimitPerDay"
      >
        <UInput
          v-model.number="state.rateLimitPerDay"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        label="日配额"
        name="dailyQuota"
      >
        <UInput
          v-model.number="state.dailyQuota"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        label="超时(ms)"
        name="timeoutMs"
      >
        <UInput
          v-model.number="state.timeoutMs"
          type="number"
          min="0"
        />
      </UFormField>
    </div>
  </div>
</template>
