<script setup lang="ts">
import type { RedeemRecord } from '~/composables/user/useUserCreditsPage'
import { parseFetchError } from '#shared/utils/clientError'

const props = defineProps<{
  records: RedeemRecord[]
  onRedeem: (code: string) => Promise<unknown>
}>()

const toast = useToast()
const code = ref('')
const redeeming = ref(false)

function formatDate(iso: string) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

async function submit() {
  const v = code.value.trim().toUpperCase()
  if (!v) {
    toast.add({ title: '请输入兑换码', color: 'warning' })
    return
  }
  redeeming.value = true
  try {
    await props.onRedeem(v)
    code.value = ''
  } catch (err) {
    toast.add({ title: parseFetchError(err, '兑换失败'), color: 'error' })
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
        <h3 class="font-semibold">
          兑换码
        </h3>
      </div>
    </template>
    <div class="flex flex-wrap items-end gap-3">
      <UFormField
        label="输入兑换码"
        class="flex-1 min-w-[260px]"
        hint="输入后点「兑换」即可加入积分，不区分大小写"
      >
        <UInput
          v-model="code"
          placeholder="例如 WELCOME-XXXXXXXXXXXXXXXX"
          class="font-mono uppercase"
          :ui="{ base: 'uppercase' }"
          @keydown.enter="submit"
        />
      </UFormField>
      <UButton
        icon="i-mdi-gift-outline"
        :loading="redeeming"
        @click="submit"
      >
        兑换
      </UButton>
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
          v-for="r in records"
          :key="r.id"
          class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/30 px-3 py-1 text-xs"
        >
          <span class="font-mono text-muted">{{ r.code || `#${r.codeId}` }}</span>
          <span class="font-semibold text-success tabular-nums">
            +{{ r.amount.toLocaleString() }}
          </span>
          <span class="text-muted">{{ formatDate(r.redeemedAt) }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
