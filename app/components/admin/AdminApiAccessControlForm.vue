<script setup lang="ts">
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'

defineProps<{ hasChargedMethod: boolean }>()

const state = useAdminApiForm()
</script>

<template>
  <section class="rounded-xl border border-default bg-elevated/30 p-4 lg:col-span-2">
    <div class="mb-4 flex items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-mdi-shield-key-outline" class="size-4" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          访问控制
        </h3>
        <p class="text-xs text-muted">
          控制接口可用性、鉴权与调用统计
        </p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
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
  </section>
</template>
