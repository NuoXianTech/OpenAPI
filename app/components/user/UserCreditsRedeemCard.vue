<script setup lang="ts">
import type { RedeemRecord } from '~/composables/user/use-user-credits-page'
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  records: RedeemRecord[]
  onRedeem: (code: string) => Promise<unknown>
}>()

const toast = useToast()
const code = ref('')
const redeeming = ref(false)

async function submit() {
  const value = code.value.trim().toUpperCase()
  if (!value) {
    toast.add({ title: '请输入兑换码', color: 'warning' })
    return
  }
  redeeming.value = true
  try {
    await props.onRedeem(value)
    code.value = ''
  } catch (error) {
    toast.add({ title: parseFetchError(error, '兑换失败'), color: 'error' })
  } finally {
    redeeming.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-ticket-percent-outline"
          class="size-5 text-muted"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          兑换码
        </h3>
      </div>
    </template>
    <div>
      <UFormField
        label="兑换码"
        class="flex max-sm:flex-col justify-between items-start gap-4"
        hint="输入后点「兑换」即可加入积分，不区分大小写"
        :ui="{ label: 'sr-only', container: 'w-full sm:max-w-md' }"
      >
        <div class="flex w-full max-sm:flex-col gap-2">
          <UInput
            v-model="code"
            placeholder="例如 WELCOME-XXXXXXXXXXXXXXXX"
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
            兑换
          </UButton>
        </div>
      </UFormField>
    </div>
    <div
      v-if="records.length > 0"
      class="mt-4 pt-3 border-t border-default"
    >
      <div class="text-xs text-muted mb-2">
        最近兑换
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="record in records"
          :key="record.id"
          class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/30 px-3 py-1 text-xs"
        >
          <span class="font-mono text-muted">{{ record.code || `#${record.codeId}` }}</span>
          <span class="font-semibold text-success tabular-nums">
            +{{ record.amount.toLocaleString() }}
          </span>
          <span class="text-muted">{{ formatDateTime(record.redeemedAt) }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
