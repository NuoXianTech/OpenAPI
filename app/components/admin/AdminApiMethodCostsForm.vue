<script setup lang="ts">
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'

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
  <section class="rounded-lg border border-default bg-elevated/30 p-4">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
        <UIcon name="i-mdi-cash-multiple" class="size-4" />
      </span>
      <div class="me-auto">
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('admin.apis.form.costs.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ $t('admin.apis.form.costs.description') }}
        </p>
      </div>
      <UBadge
        v-if="!state.isApiKey"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ $t('admin.apis.form.costs.requiresApiKey') }}
      </UBadge>
      <UBadge
        v-else-if="hasChargedMethod"
        color="warning"
        variant="subtle"
        size="sm"
      >
        {{ $t('admin.apis.form.costs.hasPaidMethods') }}
      </UBadge>
      <UBadge
        v-else
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ $t('admin.apis.form.costs.allFree') }}
      </UBadge>
    </div>
    <UFormField
      :label="$t('admin.apis.form.costs.pointsPerCall')"
      name="methodCosts"
    >
      <div class="grid gap-x-5 gap-y-2 sm:grid-cols-2">
        <div
          v-for="method in availableMethods"
          :key="method"
          class="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-2"
        >
          <ApiHttpMethodBadge
            :method="method"
            class="w-16 justify-center"
          />
          <UInput
            type="number"
            min="0"
            :model-value="getMethodCost(method)"
            :disabled="!state.isApiKey"
            :placeholder="state.isApiKey
              ? $t('admin.apis.form.costs.freePlaceholder')
              : $t('admin.apis.form.costs.requiresApiKey')"
            class="flex-1"
            @update:model-value="(v: number | string) => setMethodCost(method, v)"
          />
        </div>
      </div>
      <p class="text-xs text-muted mt-2">
        {{ $t('admin.apis.form.costs.help') }}
      </p>
    </UFormField>
  </section>
</template>
