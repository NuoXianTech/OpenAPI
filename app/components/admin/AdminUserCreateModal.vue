<script setup lang="ts">
const props = defineProps<{
  open: boolean
  onSubmit: (payload: { username: string, email: string, password: string, displayName: string, isActive: boolean }) => Promise<boolean>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const form = reactive({
  username: '',
  email: '',
  password: '',
  displayName: '',
  isActive: true
})
const loading = ref(false)

function resetForm() {
  form.username = ''
  form.email = ''
  form.password = ''
  form.displayName = ''
  form.isActive = true
}

watch(() => props.open, (opened) => {
  if (opened) resetForm()
})

async function submit() {
  loading.value = true
  const ok = await props.onSubmit({ ...form })
  loading.value = false
  if (ok) emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    title="添加用户"
    description="直接创建用户账户，跳过邮箱验证流程"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-3"
        @submit.prevent="submit"
      >
        <UFormField
          label="用户名"
          required
          help="3-32 位，仅限字母、数字、下划线和短横线"
        >
          <UInput
            v-model="form.username"
            placeholder="例如：alice_2026"
            autocomplete="off"
          />
        </UFormField>
        <UFormField
          label="邮箱"
          required
        >
          <UInput
            v-model="form.email"
            type="email"
            placeholder="user@example.com"
            autocomplete="off"
          />
        </UFormField>
        <UFormField
          label="初始密码"
          required
          help="至少 8 位"
        >
          <UInput
            v-model="form.password"
            type="password"
            placeholder="至少 8 位"
            autocomplete="new-password"
          />
        </UFormField>
        <UFormField
          label="显示名（可选）"
          help="留空时默认与用户名一致"
        >
          <UInput
            v-model="form.displayName"
            :maxlength="32"
          />
        </UFormField>
        <USwitch
          v-model="form.isActive"
          label="创建后立即激活"
        />

        <div class="flex justify-end gap-2 pt-3">
          <UButton
            variant="outline"
            color="neutral"
            @click="emit('update:open', false)"
          >
            取消
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            创建
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
