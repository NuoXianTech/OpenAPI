<script setup lang="ts">
import { useAdminApiForm } from '~/composables/admin/useAdminApiForm'

defineProps<{
  availableMethods: string[]
  hasChargedMethod: boolean
}>()

const state = useAdminApiForm()

function getMethodCost(method: string): number {
  const v = state.methodCosts?.[method.toUpperCase()]
  return typeof v === 'number' && v >= 0 ? v : 0
}

function setMethodCost(method: string, value: number | string | null | undefined) {
  const num = Number(value)
  const safe = Number.isFinite(num) && num > 0 ? Math.trunc(num) : 0
  const next: Record<string, number> = { ...(state.methodCosts || {}) }
  const key = method.toUpperCase()
  if (safe === 0) {
    if (key in next) {
      const { [key]: _omit, ...rest } = next
      state.methodCosts = rest
      return
    }
    state.methodCosts = next
    return
  }
  next[key] = safe
  state.methodCosts = next
}
</script>

<template>
  <div class="border-t border-default pt-3 mt-3">
    <div class="text-sm font-medium mb-2 flex items-center gap-2">
      <span>计费（按 HTTP 方法）</span>
      <UBadge
        v-if="!state.isApiKey"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        需先开启「必需 API Key」
      </UBadge>
      <UBadge
        v-else-if="hasChargedMethod"
        color="warning"
        variant="subtle"
        size="sm"
      >
        含收费方法
      </UBadge>
      <UBadge
        v-else
        color="success"
        variant="subtle"
        size="sm"
      >
        整组免费
      </UBadge>
    </div>
    <UFormField
      label="单次调用消耗积分"
      name="methodCosts"
    >
      <div class="flex flex-col gap-2">
        <div
          v-for="method in availableMethods"
          :key="method"
          class="flex items-center gap-2"
        >
          <UBadge
            :color="httpMethodColor(method)"
            variant="subtle"
            size="sm"
            class="font-mono w-16 justify-center"
          >
            {{ method }}
          </UBadge>
          <UInput
            type="number"
            min="0"
            :model-value="getMethodCost(method)"
            :disabled="!state.isApiKey"
            :placeholder="state.isApiKey ? '0 = 免费' : '请先开启「必需 API Key」'"
            class="flex-1"
            @update:model-value="(v: number | string) => setMethodCost(method, v)"
          />
          <span
            class="text-xs w-12 text-right"
            :class="getMethodCost(method) > 0 ? 'text-warning' : 'text-success'"
          >
            {{ getMethodCost(method) > 0 ? `${getMethodCost(method)} / 次` : '免费' }}
          </span>
        </div>
      </div>
      <p class="text-xs text-muted mt-2">
        逐方法填写本次调用消耗的积分。0 / 留空 = 该方法免费。开启「必需 API Key」后才能配置扣费。调用成功才扣，失败/业务标记失败时不扣。
      </p>
    </UFormField>
  </div>
</template>
