<script setup lang="ts">
import type { AdminUserItem } from '~/composables/admin/use-admin-users-page'
import { adminModalUi } from '~/utils/admin-modal-ui'

type DurationPreset = 'permanent' | '1d' | '7d' | '30d' | 'custom'

const props = defineProps<{
  open: boolean
  target: AdminUserItem | null
  onSubmit: (id: number, payload: { reason: string, bannedUntil: string | null }) => Promise<boolean>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
const { t } = useI18n()

const durationItems = computed<Array<{ label: string, value: DurationPreset }>>(() => [
  { label: t('admin.users.ban.durations.permanent'), value: 'permanent' },
  { label: t('admin.users.ban.durations.oneDay'), value: '1d' },
  { label: t('admin.users.ban.durations.sevenDays'), value: '7d' },
  { label: t('admin.users.ban.durations.thirtyDays'), value: '30d' },
  { label: t('admin.users.ban.durations.custom'), value: 'custom' }
])

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
    if (!form.customUntil) return t('admin.users.ban.validation.requiredUntil')
    const d = new Date(form.customUntil)
    if (Number.isNaN(d.getTime())) return t('admin.users.ban.validation.invalidUntil')
    if (d.getTime() <= Date.now()) return t('admin.users.ban.validation.futureUntil')
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
    :title="$t('admin.users.ban.title', { username: target?.username ?? '' })"
    :ui="adminModalUi()"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UFormField
          :label="$t('admin.users.ban.reason')"
          :hint="$t('admin.users.ban.reasonHint')"
        >
          <UTextarea
            v-model="form.reason"
            :rows="3"
            :maxlength="500"
            :placeholder="$t('admin.users.ban.reasonPlaceholder')"
            class="w-full sm:max-w-lg"
          />
        </UFormField>

        <UFormField :label="$t('admin.users.ban.duration')">
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
            :placeholder="$t('admin.users.ban.untilPlaceholder')"
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
            {{ $t('admin.users.ban.description') }}
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
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          color="error"
          :loading="loading"
          @click="submit"
        >
          {{ $t('admin.users.ban.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
