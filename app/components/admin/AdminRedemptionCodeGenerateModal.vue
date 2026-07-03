<script setup lang="ts">
import type { GeneratePayload, GenerateResult } from '~/composables/admin/useRedemptionCodesPage'
import { parseFetchError } from '#shared/utils/client-error'

const props = defineProps<{
  open: boolean
  onGenerate: (payload: GeneratePayload) => Promise<GenerateResult>
  onCopyOne: (code: string) => void
  onCopyAll: (codes: Array<{ code: string }>) => void
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToast()

const form = reactive({
  amount: 100,
  count: 1,
  prefix: '',
  length: 16,
  maxUses: 1,
  expiresInDays: 0,
  note: ''
})

const generating = ref(false)
const result = ref<GenerateResult | null>(null)

function resetForm() {
  Object.assign(form, {
    amount: 100,
    count: 1,
    prefix: '',
    length: 16,
    maxUses: 1,
    expiresInDays: 0,
    note: ''
  })
  result.value = null
}

watch(() => props.open, (v) => {
  if (v) resetForm()
})

async function submit() {
  if (!Number.isFinite(form.amount) || form.amount <= 0) {
    toast.add({ title: 'amount 必须 > 0', color: 'warning' })
    return
  }
  generating.value = true
  try {
    let expiresAt: string | null = null
    if (form.expiresInDays > 0) {
      const d = new Date()
      d.setDate(d.getDate() + Math.trunc(form.expiresInDays))
      expiresAt = d.toISOString()
    }
    result.value = await props.onGenerate({
      amount: Math.trunc(form.amount),
      count: Math.trunc(form.count),
      prefix: form.prefix.trim() || null,
      length: Math.trunc(form.length),
      maxUses: Math.trunc(form.maxUses),
      expiresAt,
      note: form.note.trim() || null
    })
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '生成失败'), color: 'error' })
  } finally {
    generating.value = false
  }
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    title="生成兑换码"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div
        v-if="!result"
        class="space-y-3"
      >
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="单张面额（必填）">
            <UInput
              v-model.number="form.amount"
              type="number"
              min="1"
              placeholder="例如 100"
            />
          </UFormField>
          <UFormField label="生成数量">
            <UInput
              v-model.number="form.count"
              type="number"
              min="1"
              max="1000"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="码长度"
            hint="不含前缀，8 - 48"
          >
            <UInput
              v-model.number="form.length"
              type="number"
              min="8"
              max="48"
            />
          </UFormField>
          <UFormField
            label="前缀（可选）"
            hint="如 WELCOME"
          >
            <UInput
              v-model="form.prefix"
              placeholder=""
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="单张可被兑换次数"
            hint=">1 表示同一码可被多个用户共享，每人 1 次"
          >
            <UInput
              v-model.number="form.maxUses"
              type="number"
              min="1"
            />
          </UFormField>
          <UFormField
            label="过期时间（天）"
            hint="0 = 永不过期"
          >
            <UInput
              v-model.number="form.expiresInDays"
              type="number"
              min="0"
            />
          </UFormField>
        </div>
        <UFormField label="备注（可选）">
          <UInput
            v-model="form.note"
            placeholder="例如：双十一活动"
          />
        </UFormField>
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <UAlert
          color="success"
          variant="subtle"
          icon="i-mdi-check-circle-outline"
          :title="`已生成 ${result.generated} 张兑换码`"
          :description="`批次 ${result.batchId}` + (result.generated < result.requested
            ? ` · 申请 ${result.requested} 张，因冲突实际生成 ${result.generated} 张` : '')"
        />
        <div class="flex justify-end">
          <UButton
            size="sm"
            variant="outline"
            icon="i-mdi-content-copy"
            @click="onCopyAll(result.codes)"
          >
            复制全部
          </UButton>
        </div>
        <div class="rounded-lg border border-default p-3 bg-elevated/30 max-h-72 overflow-auto">
          <div
            v-for="c in result.codes"
            :key="c.id"
            class="flex items-center justify-between gap-2 py-1"
          >
            <span class="font-mono text-sm">
              {{ c.code }}
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-mdi-content-copy"
              @click="onCopyOne(c.code)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div
        v-if="!result"
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          @click="close"
        >
          取消
        </UButton>
        <UButton
          :loading="generating"
          @click="submit"
        >
          生成
        </UButton>
      </div>
      <div
        v-else
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          @click="result = null"
        >
          继续生成
        </UButton>
        <UButton @click="close">
          完成
        </UButton>
      </div>
    </template>
  </UModal>
</template>
