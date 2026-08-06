<script setup lang="ts">
import type { RedeemRecord } from '~/composables/user/use-user-credits-page'
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  records: RedeemRecord[]
  onRedeem: (code: string) => Promise<unknown>
}>()

const toast = useToast()
const { t, locale } = useI18n()
const code = ref('')
const redeeming = ref(false)

async function submit() {
  const value = code.value.trim().toUpperCase()
  if (!value) {
    toast.add({ title: t('user.credits.redeem.enterCode'), color: 'warning' })
    return
  }
  redeeming.value = true
  try {
    await props.onRedeem(value)
    code.value = ''
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('user.credits.redeem.failed')), color: 'error' })
  } finally {
    redeeming.value = false
  }
}
</script>

<template>
  <DashboardContentCard
    :title="$t('user.credits.redeem.code')"
    :description="$t('user.credits.redeem.description')"
    icon="i-mdi-ticket-percent-outline"
  >
    <UFormField
      :label="$t('user.credits.redeem.code')"
      :hint="$t('user.credits.redeem.hint')"
      class="flex items-start justify-between gap-4 max-sm:flex-col"
      :ui="{ label: 'sr-only', container: 'w-full sm:max-w-md' }"
    >
      <div class="flex w-full gap-2 max-sm:flex-col">
        <UInput
          v-model="code"
          :placeholder="$t('user.credits.redeem.placeholder')"
          class="min-w-0 flex-1 font-mono uppercase"
          :ui="{ base: 'uppercase' }"
          @keydown.enter="submit"
        />
        <UButton
          icon="i-mdi-gift-outline"
          :loading="redeeming"
          class="max-sm:w-full sm:shrink-0"
          @click="submit"
        >
          {{ $t('user.credits.redeem.action') }}
        </UButton>
      </div>
    </UFormField>
    <div
      v-if="records.length > 0"
      class="mt-4 pt-3 border-t border-default"
    >
      <div class="text-xs text-muted mb-2">
        {{ $t('user.credits.redeem.recent') }}
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="record in records"
          :key="record.id"
          class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/30 px-3 py-1 text-xs"
        >
          <span class="font-mono text-muted">{{ record.code || `#${record.codeId}` }}</span>
          <span class="font-semibold text-success tabular-nums">
            +{{ record.amount.toLocaleString(locale) }}
          </span>
          <span class="text-muted">{{ formatDateTime(record.redeemedAt, '-', locale) }}</span>
        </div>
      </div>
    </div>
  </DashboardContentCard>
</template>
