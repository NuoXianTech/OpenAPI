<script setup lang="ts">
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** 选中的目标用户 id 列表；为空表示「全部用户」 */
  userIds: number[]
  /** 用于在标题/描述中显示，便于辨识 */
  selectionLabel: string
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const operation = ref<'grant' | 'revoke' | 'reset'>('grant')
const amount = ref<number>(0)
const remark = ref<string>('')
const loading = ref(false)

const operationItems = [
  { label: '加积分（grant）', value: 'grant' },
  { label: '减积分（revoke）', value: 'revoke' },
  { label: '重置积分（reset）', value: 'reset' }
]

const operationHelp = computed(() => {
  switch (operation.value) {
    case 'grant':
      return '将指定积分加到目标用户的积分上。'
    case 'revoke':
      return '从目标用户积分中扣除指定数量；不足时扣到 0。'
    case 'reset':
      return '将目标用户积分重置为指定数量（默认 0）。'
    default:
      return ''
  }
})

const targetSummary = computed(() => {
  if (props.userIds.length === 0) return '全部未删除用户'
  if (props.userIds.length === 1) return props.selectionLabel
  return `${props.userIds.length} 个用户`
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
    toast.add({ title: '积分必须大于 0', color: 'warning' })
    return
  }
  loading.value = true
  try {
    await $fetch('/api/admin/users/credits/adjust', {
      method: 'POST',
      body: {
        scope: props.userIds.length === 0 ? 'all' : 'selected',
        confirmAll: props.userIds.length === 0,
        userIds: props.userIds,
        operation: operation.value,
        amount: Math.max(Math.trunc(amount.value), 0),
        remark: remark.value.trim() || undefined
      }
    })
    toast.add({ title: '积分调整成功', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="积分管理"
    :description="`目标：${targetSummary}`"
    :ui="adminModalUi()"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="操作类型">
          <USelect
            v-model="operation"
            :items="operationItems"
          />
          <p class="text-xs text-muted mt-1">
            {{ operationHelp }}
          </p>
        </UFormField>

        <UFormField :label="operation === 'reset' ? '目标积分' : '积分'">
          <UInput
            v-model.number="amount"
            type="number"
            min="0"
            placeholder="请输入积分"
          />
        </UFormField>

        <UFormField label="备注（可选）">
          <UTextarea
            v-model="remark"
            :rows="2"
            placeholder="例如：促销发放 / 违规扣除"
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
          取消
        </UButton>
        <UButton
          :loading="loading"
          @click="submit"
        >
          确认
        </UButton>
      </div>
    </template>
  </UModal>
</template>
