<script setup lang="ts">
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** 目标用户 ID 列表，至少包含一项。 */
  userIds: number[]
  /** 用于在标题/描述中显示，便于辨识 */
  selectionLabel: string
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const { t } = useI18n()

const operation = ref<'grant' | 'revoke' | 'reset'>('grant')
const amount = ref<number>(0)
const remark = ref<string>('')
const loading = ref(false)

const operationItems = computed(() => [
  { label: t('admin.credits.adjust.operations.grant'), value: 'grant' },
  { label: t('admin.credits.adjust.operations.revoke'), value: 'revoke' },
  { label: t('admin.credits.adjust.operations.reset'), value: 'reset' }
])

const operationHelp = computed(() => {
  switch (operation.value) {
    case 'grant':
      return t('admin.credits.adjust.help.grant')
    case 'revoke':
      return t('admin.credits.adjust.help.revoke')
    case 'reset':
      return t('admin.credits.adjust.help.reset')
    default:
      return ''
  }
})

const targetSummary = computed(() => {
  if (props.userIds.length === 1) return props.selectionLabel
  return t('admin.credits.adjust.userCount', { count: props.userIds.length })
})

watch(open, (val) => {
  if (val) {
    operation.value = 'grant'
    amount.value = 0
    remark.value = ''
  }
})

async function submit() {
  if (operation.value !== 'reset' && amount.value <= 0) {
    toast.add({ title: t('admin.credits.adjust.validation.positiveAmount'), color: 'warning' })
    return
  }
  loading.value = true
  try {
    await $fetch('/api/admin/users/credits/adjust', {
      method: 'POST',
      body: {
        userIds: props.userIds,
        operation: operation.value,
        amount: Math.max(Math.trunc(amount.value), 0),
        remark: remark.value.trim() || undefined
      }
    })
    toast.add({ title: t('admin.credits.adjust.success'), color: 'success' })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('admin.credits.adjust.title')"
    :description="$t('admin.credits.adjust.target', { target: targetSummary })"
    :ui="adminModalUi()"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('admin.credits.adjust.operationType')">
          <USelect
            v-model="operation"
            :items="operationItems"
          />
          <p class="text-xs text-muted mt-1">
            {{ operationHelp }}
          </p>
        </UFormField>

        <UFormField :label="operation === 'reset' ? $t('admin.credits.adjust.targetAmount') : $t('admin.credits.adjust.amount')">
          <UInput
            v-model.number="amount"
            type="number"
            min="0"
            :placeholder="$t('admin.credits.adjust.amountPlaceholder')"
          />
        </UFormField>

        <UFormField :label="$t('admin.credits.adjust.remark')">
          <UTextarea
            v-model="remark"
            :rows="2"
            :placeholder="$t('admin.credits.adjust.remarkPlaceholder')"
            class="w-full sm:max-w-lg"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="() => { open = false }"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :loading="loading"
          @click="submit"
        >
          {{ $t('common.actions.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
