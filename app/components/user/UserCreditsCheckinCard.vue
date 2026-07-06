<script setup lang="ts">
import type { CheckinStatus } from '~/composables/user/use-user-credits-page'
import { parseFetchError } from '~/utils/client-error'

const props = defineProps<{
  status: CheckinStatus | null
  loading: boolean
  submitting: boolean
  onCheckin: (turnstileToken?: string) => Promise<unknown>
}>()

const toast = useToast()
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
  if (ms <= 0) return '现在可签到'
  const total = Math.ceil(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d} 天 ${h} 小时 ${m} 分 ${s} 秒`
  if (h > 0) return `${h} 小时 ${m} 分 ${s} 秒`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
})

const amountText = computed(() => {
  const s = props.status
  if (!s) return ''
  if (s.mode === 'range') return `${s.amountMin} ~ ${s.amountMax} 积分`
  return `${s.amountFixed} 积分`
})

const cooldownText = computed(() => {
  const s = props.status
  if (!s) return ''
  if (s.cooldownMode === 'fixed_time') return `每日 ${s.fixedRefreshTime} 刷新`
  return `每 ${s.refreshHours} 小时刷新`
})

const canCheckin = computed(() => {
  if (!props.status) return false
  if (!props.status.enabled) return false
  return remainingMs.value <= 0
})

const turnstileRequired = computed(() => {
  // status 与公开 turnstile 配置任意一方说明需要，就需要
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
  } catch (err) {
    toast.add({ title: parseFetchError(err, '签到失败'), color: 'error' })
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

// Turnstile 通过后自动签到 + 关闭弹窗
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
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-calendar-check"
          class="size-5 text-muted"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          每日签到
        </h3>
        <span
          v-if="status && !status.enabled"
          class="ml-2 text-xs text-muted"
        >已关闭</span>
      </div>
    </template>

    <div
      v-if="loading && !status"
      class="text-sm text-muted py-4 text-center"
    >
      加载中...
    </div>

    <div
      v-else-if="status && !status.enabled"
      class="text-sm text-muted py-2"
    >
      管理员未开启签到功能。
    </div>

    <div
      v-else-if="status"
      class="flex flex-wrap items-end gap-4"
    >
      <div class="flex-1 min-w-[200px]">
        <p class="text-xs text-muted">
          签到奖励
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
          {{ canCheckin ? '现在可签到' : '下次签到' }}
        </p>
        <p class="text-base font-medium tabular-nums mt-1">
          {{ remainingText }}
        </p>
        <p
          v-if="status.lastCheckinAt"
          class="text-xs text-muted mt-1"
        >
          上次签到：{{ formatDateTime(status.lastCheckinAt) }}
        </p>
      </div>
      <UButton
        size="lg"
        icon="i-lucide-badge-check"
        :loading="submitting"
        :disabled="!canCheckin"
        @click="onClickCheckin"
      >
        {{ canCheckin ? '立即签到' : '冷却中' }}
      </UButton>
    </div>

    <div
      v-else
      class="text-sm text-error py-2"
    >
      签到状态加载失败。
    </div>

    <UModal
      v-model:open="modalOpen"
      :ui="{ content: 'max-w-sm' }"
      :dismissible="!submitting && !verifying"
      title="人机验证"
      description="完成下方人机验证后将自动签到"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            为防止刷量，签到前需要完成 Cloudflare Turnstile 人机验证。验证通过后会自动签到。
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
            Turnstile siteKey 未配置，请联系管理员。
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
              name="i-lucide-loader-circle"
              class="size-4 animate-spin"
            />
            正在提交签到...
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
            取消
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
