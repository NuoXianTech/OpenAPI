<script setup lang="ts">
import type { AdminUserItem } from '~/composables/admin/use-admin-users-page'

type DurationPreset = 'permanent' | '1d' | '7d' | '30d' | 'custom'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
  onSubmit: (id: number, payload: { reason: string, bannedUntil: string | null }) => Promise<boolean>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const durationItems: Array<{ label: string, value: DurationPreset }> = [
  { label: '永久', value: 'permanent' },
  { label: '1 天', value: '1d' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '自定义', value: 'custom' }
]

function defaultCustomUntil() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const form = reactive({
  reason: '',
  duration: 'permanent' as DurationPreset,
  customUntil: defaultCustomUntil()
})

const loading = ref(false)

watch(() => props.open, (opened) => {
  if (opened) {
    form.reason = ''
    form.duration = 'permanent'
    form.customUntil = defaultCustomUntil()
  }
})

function computeBannedUntil(): string | null {
  switch (form.duration) {
    case 'permanent': return null
    case '1d': return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    case '7d': return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d': return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'custom': {
      if (!form.customUntil) return null
      const d = new Date(form.customUntil)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
  }
}

const formError = computed(() => {
  if (form.duration === 'custom') {
    if (!form.customUntil) return '请填写解封时间'
    const d = new Date(form.customUntil)
    if (Number.isNaN(d.getTime())) return '解封时间格式不正确'
    if (d.getTime() <= Date.now()) return '解封时间必须晚于当前时间'
  }
  return null
})

const toast = useToast()

async function submit() {
  if (!props.target) return
  if (formError.value) {
    toast.add({ title: formError.value, color: 'warning' })
    return
  }
  loading.value = true
  const ok = await props.onSubmit(props.target.id, {
    reason: form.reason.trim(),
    bannedUntil: computeBannedUntil()
  })
  loading.value = false
  if (ok) emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="`封禁用户: ${target?.username ?? ''}`"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UFormField
          label="封禁原因"
          hint="可选，将展示给被封禁用户"
        >
          <UTextarea
            v-model="form.reason"
            :rows="3"
            :maxlength="500"
            placeholder="例如：违反社区规范、滥用接口等"
            class="w-full"
          />
        </UFormField>

        <UFormField label="封禁时长">
          <URadioGroup
            v-model="form.duration"
            orientation="horizontal"
            :items="durationItems"
          />
          <CommonDateTimePicker
            v-if="form.duration === 'custom'"
            v-model="form.customUntil"
            class="mt-2"
            size="sm"
            placeholder="选择解封时间"
          />
          <p
            v-if="formError"
            class="text-xs text-error mt-1.5"
          >
            {{ formError }}
          </p>
          <p
            v-else
            class="text-xs text-muted mt-1.5"
          >
            到期后用户将被自动解封；封禁后该用户的所有会话会立即失效。
          </p>
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="emit('update:open', false)"
        >
          取消
        </UButton>
        <UButton
          color="error"
          :loading="loading"
          @click="submit"
        >
          确认封禁
        </UButton>
      </div>
    </template>
  </UModal>
</template>
