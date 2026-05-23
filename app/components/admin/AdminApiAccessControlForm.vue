<script setup lang="ts">
defineProps<{ hasChargedMethod: boolean }>()

const state = useAdminApiForm()
</script>

<template>
  <div class="border-t border-default pt-3 mt-3">
    <div class="text-sm font-medium mb-2">
      访问控制
    </div>
    <div class="flex flex-wrap gap-6">
      <USwitch
        v-model="state.isEnabled"
        label="启用接口"
      />
      <USwitch
        v-model="state.isApiKey"
        label="必需 API Key"
      />
      <USwitch
        v-model="state.isStatistics"
        label="统计调用"
        :disabled="!state.isEnabled"
      />
    </div>
    <p
      v-if="!state.isEnabled"
      class="text-xs text-muted mt-2"
    >
      启用接口后才能开启调用统计。
    </p>
    <p
      v-if="!state.isApiKey && hasChargedMethod"
      class="text-xs text-warning mt-2"
    >
      关闭「必需 API Key」会清空所有方法的扣费配置（无法定位扣款账户）。
    </p>
  </div>
</template>
