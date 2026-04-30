<script setup lang="ts">
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
  { label: '加余额（grant）', value: 'grant' },
  { label: '减余额（revoke）', value: 'revoke' },
  { label: '重置余额（reset）', value: 'reset' },
]

const operationHelp = computed(() => {
  switch (operation.value) {
    case 'grant':
      return '将指定金额加到目标用户的余额上。'
    case 'revoke':
      return '从目标用户余额中扣除指定金额；不足时扣到 0。'
    case 'reset':
      return '将目标用户余额重置为指定金额（默认 0）。'
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
    toast.add({ title: '金额必须大于 0', color: 'warning' })
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
        remark: remark.value.trim() || undefined,
      },
    })
    toast.add({ title: '余额调整成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4">
        <div>
          <h3 class="text-lg font-semibold">
            余额管理
          </h3>
          <p class="text-sm text-muted mt-1">
            目标：<span class="font-medium text-default">{{ targetSummary }}</span>
          </p>
        </div>

        <UFormField label="操作类型">
          <USelect
            v-model="operation"
            :items="operationItems"
          />
          <p class="text-xs text-muted mt-1">
            {{ operationHelp }}
          </p>
        </UFormField>

        <UFormField :label="operation === 'reset' ? '目标余额' : '金额'">
          <UInput
            v-model.number="amount"
            type="number"
            min="0"
            placeholder="请输入金额"
          />
        </UFormField>

        <UFormField label="备注（可选）">
          <UTextarea
            v-model="remark"
            :rows="2"
            placeholder="例如：促销发放 / 违规扣除"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="open = false"
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
      </div>
    </template>
  </UModal>
</template>
