<script setup lang="ts">
import type { GeneratePayload, GenerateResult } from '~/composables/admin/use-redemption-codes-page'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

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
const { t } = useI18n()

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
    toast.add({ title: t('admin.credits.redemptionCodes.generate.validation.positiveAmount'), color: 'warning' })
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
    toast.add({
      title: parseFetchError(err, t('admin.credits.redemptionCodes.generate.failed')),
      color: 'error'
    })
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
    :title="$t('admin.credits.redemptionCodes.generate.title')"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div
        v-if="!result"
        class="space-y-3"
      >
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('admin.credits.redemptionCodes.generate.amount')">
            <UInput
              v-model.number="form.amount"
              type="number"
              min="1"
              :placeholder="$t('admin.credits.redemptionCodes.generate.amountPlaceholder')"
            />
          </UFormField>
          <UFormField :label="$t('admin.credits.redemptionCodes.generate.count')">
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
            :label="$t('admin.credits.redemptionCodes.generate.length')"
            :hint="$t('admin.credits.redemptionCodes.generate.lengthHint')"
          >
            <UInput
              v-model.number="form.length"
              type="number"
              min="8"
              max="48"
            />
          </UFormField>
          <UFormField
            :label="$t('admin.credits.redemptionCodes.generate.prefix')"
            :hint="$t('admin.credits.redemptionCodes.generate.prefixHint')"
          >
            <UInput
              v-model="form.prefix"
              placeholder=""
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('admin.credits.redemptionCodes.generate.maxUses')"
            :hint="$t('admin.credits.redemptionCodes.generate.maxUsesHint')"
          >
            <UInput
              v-model.number="form.maxUses"
              type="number"
              min="1"
            />
          </UFormField>
          <UFormField
            :label="$t('admin.credits.redemptionCodes.generate.expiresInDays')"
            :hint="$t('admin.credits.redemptionCodes.generate.expiresInDaysHint')"
          >
            <UInput
              v-model.number="form.expiresInDays"
              type="number"
              min="0"
            />
          </UFormField>
        </div>
        <UFormField :label="$t('admin.credits.redemptionCodes.generate.note')">
          <UInput
            v-model="form.note"
            :placeholder="$t('admin.credits.redemptionCodes.generate.notePlaceholder')"
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
          :title="$t('admin.credits.redemptionCodes.generate.resultTitle', { count: result.generated })"
          :description="result.generated < result.requested
            ? $t('admin.credits.redemptionCodes.generate.partialResultDescription', {
              batchId: result.batchId,
              requested: result.requested,
              generated: result.generated
            })
            : $t('admin.credits.redemptionCodes.generate.resultDescription', { batchId: result.batchId })"
        />
        <div class="flex justify-end">
          <UButton
            size="sm"
            variant="outline"
            icon="i-mdi-content-copy"
            @click="onCopyAll(result.codes)"
          >
            {{ $t('admin.credits.redemptionCodes.actions.copyAll') }}
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
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :loading="generating"
          @click="submit"
        >
          {{ $t('admin.credits.redemptionCodes.actions.generate') }}
        </UButton>
      </div>
      <div
        v-else
        class="flex justify-end gap-2 w-full"
      >
        <UButton
          variant="outline"
          color="neutral"
          @click="() => { result = null }"
        >
          {{ $t('admin.credits.redemptionCodes.actions.generateMore') }}
        </UButton>
        <UButton @click="close">
          {{ $t('admin.credits.redemptionCodes.actions.done') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
