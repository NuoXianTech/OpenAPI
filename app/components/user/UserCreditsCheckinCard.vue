<script setup lang="ts">
import type { CheckinStatus } from '~/composables/user/use-user-credits-page'
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  status: CheckinStatus | null
  hasError: boolean
  submitting: boolean
  onCheckin: (turnstileToken?: string) => Promise<unknown>
}>()

const toast = useToast()
const { t, locale } = useI18n()
const { turnstile } = useSiteSettings()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const remainingMs = computed(() => {
  if (!props.status?.nextCheckinAt) return 0
  const next = new Date(props.status.nextCheckinAt).getTime()
  return Math.max(0, next - now.value)
})

const remainingText = computed(() => {
  const ms = remainingMs.value
  if (ms <= 0) return t('user.credits.checkin.availableNow')
  const total = Math.ceil(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return t('user.credits.checkin.duration.days', { days, hours, minutes, seconds })
  if (hours > 0) return t('user.credits.checkin.duration.hours', { hours, minutes, seconds })
  if (minutes > 0) return t('user.credits.checkin.duration.minutes', { minutes, seconds })
  return t('user.credits.checkin.duration.seconds', { seconds })
})

const amountText = computed(() => {
  const status = props.status
  if (!status) return ''
  if (status.mode === 'range') {
    return t('user.credits.checkin.amount.range', {
      min: status.amountMin.toLocaleString(locale.value),
      max: status.amountMax.toLocaleString(locale.value)
    })
  }
  return t('user.credits.checkin.amount.fixed', { amount: status.amountFixed.toLocaleString(locale.value) })
})

const cooldownText = computed(() => {
  const status = props.status
  if (!status) return ''
  if (status.cooldownMode === 'fixed_time') {
    return t('user.credits.checkin.cooldown.fixedTime', { time: status.fixedRefreshTime })
  }
  return t('user.credits.checkin.cooldown.hours', { hours: status.refreshHours })
})

const canCheckin = computed(() => {
  if (!props.status) return false
  if (!props.status.enabled) return false
  return remainingMs.value <= 0
})

const turnstileRequired = computed(() => {
  if (props.status?.requiresTurnstile) return true
  return turnstile.value.enabled && turnstile.value.checkin
})

const turnstileSiteKey = computed(() => turnstile.value.siteKey)

const modalOpen = ref(false)
const turnstileToken = ref('')
const turnstileError = ref('')
const verifying = ref(false)
const turnstileWidget = ref<{ reset: () => void } | null>(null)

function openModal() {
  turnstileToken.value = ''
  turnstileError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  turnstileToken.value = ''
  turnstileError.value = ''
  turnstileWidget.value?.reset()
}

async function doCheckin(token?: string) {
  try {
    await props.onCheckin(token)
    closeModal()
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('user.credits.checkin.failed')), color: 'error' })
    turnstileWidget.value?.reset()
    turnstileToken.value = ''
  }
}

async function onClickCheckin() {
  if (!canCheckin.value || props.submitting) return
  if (turnstileRequired.value) {
    openModal()
    return
  }
  await doCheckin()
}

async function onTurnstileVerified(token: string) {
  if (verifying.value || props.submitting) return
  turnstileError.value = ''
  verifying.value = true
  try {
    await doCheckin(token)
  } finally {
    verifying.value = false
  }
}

function onTurnstileError(message: string) {
  turnstileError.value = message
}
</script>

<template>
  <DashboardContentCard
    :title="$t('user.credits.checkin.title')"
    icon="i-mdi-calendar-check-outline"
  >
    <template
      v-if="status && !status.enabled"
      #actions
    >
      <span class="text-xs text-muted">{{ $t('common.states.disabled') }}</span>
    </template>

    <div
      v-if="!status && !hasError"
      class="text-sm text-muted py-4 text-center"
    >
      {{ $t('common.states.loading') }}
    </div>

    <div
      v-else-if="status && !status.enabled"
      class="text-sm text-muted py-2"
    >
      {{ $t('user.credits.checkin.disabledDescription') }}
    </div>

    <div
      v-else-if="status"
      class="flex flex-wrap items-end gap-4"
    >
      <div class="flex-1 min-w-[200px]">
        <p class="text-xs text-muted">
          {{ $t('user.credits.checkin.reward') }}
        </p>
        <p class="text-2xl font-semibold tabular-nums mt-1 text-success">
          + {{ amountText }}
        </p>
        <p class="text-xs text-muted mt-1">
          {{ cooldownText }}
        </p>
      </div>
      <div class="flex-1 min-w-[200px]">
        <p class="text-xs text-muted">
          {{ canCheckin ? $t('user.credits.checkin.availableNow') : $t('user.credits.checkin.nextCheckin') }}
        </p>
        <p class="text-base font-medium tabular-nums mt-1">
          {{ remainingText }}
        </p>
        <p
          v-if="status.lastCheckinAt"
          class="text-xs text-muted mt-1"
        >
          {{ $t('user.credits.checkin.lastCheckin', { time: formatDateTime(status.lastCheckinAt, '-', locale) }) }}
        </p>
      </div>
      <UButton
        size="lg"
        icon="i-mdi-check-decagram-outline"
        :loading="submitting"
        :disabled="!canCheckin"
        @click="onClickCheckin"
      >
        {{ canCheckin ? $t('user.credits.checkin.action') : $t('user.credits.checkin.coolingDown') }}
      </UButton>
    </div>

    <div
      v-else
      class="text-sm text-error py-2"
    >
      {{ $t('user.credits.checkin.loadFailed') }}
    </div>

    <UModal
      v-model:open="modalOpen"
      :ui="{ content: 'max-w-sm' }"
      :dismissible="!submitting && !verifying"
      :title="$t('user.credits.checkin.captcha.title')"
      :description="$t('user.credits.checkin.captcha.description')"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            {{ $t('user.credits.checkin.captcha.instructions') }}
          </p>

          <CommonTurnstileWidget
            v-if="turnstileSiteKey"
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstileSiteKey"
            @verified="onTurnstileVerified"
            @error="onTurnstileError"
          />

          <p
            v-else
            class="text-sm text-error"
          >
            {{ $t('user.credits.checkin.captcha.missingSiteKey') }}
          </p>

          <p
            v-if="turnstileError"
            class="text-xs text-error"
          >
            {{ turnstileError }}
          </p>

          <div
            v-if="submitting || verifying"
            class="flex items-center gap-2 text-xs text-muted"
          >
            <UIcon
              name="i-mdi-loading"
              class="size-4 animate-spin"
            />
            {{ $t('user.credits.checkin.submitting') }}
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="submitting || verifying"
            @click="closeModal"
          >
            {{ $t('common.actions.cancel') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </DashboardContentCard>
</template>
