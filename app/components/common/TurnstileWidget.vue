<script setup lang="ts">
// Cloudflare Turnstile 前端组件
// 加载 Cloudflare 脚本、渲染 widget、通过 v-model 同步 token

interface TurnstileOptions {
  render: (container: HTMLElement, opts: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
  getResponse: (widgetId?: string) => string | undefined
}

interface TurnstileWindow extends Window {
  turnstile?: TurnstileOptions
  __turnstileOnLoad?: () => void
}

// 模块级 loader：所有 widget 实例共享同一个加载 Promise。
// 失败时 Promise 一次性 reject，所有等待者同步收到错误而不会卡住；
// 再次调用会重新发起加载，便于网络恢复后重试。
let scriptLoadPromise: Promise<void> | null = null

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__turnstileOnLoad'
const SCRIPT_SRC_PREFIX = SCRIPT_URL.split('?')[0]!
const SCRIPT_LOAD_TIMEOUT_MS = 12_000

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  const w = window as TurnstileWindow
  if (w.turnstile) {
    return Promise.resolve()
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) {
        return
      }
      settled = true
      fn()
    }

    w.__turnstileOnLoad = () => {
      finish(() => resolve())
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC_PREFIX}"]`)
    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.src = SCRIPT_URL
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('error', () => {
      finish(() => reject(new Error('Turnstile 脚本加载失败：无法访问 challenges.cloudflare.com')))
    }, { once: true })

    // 网络被墙/丢包时浏览器既不会触发 onload 也不会触发 error，
    // 用一个超时兜底，避免 UI 永远空白卡住。
    setTimeout(() => {
      if ((window as TurnstileWindow).turnstile) {
        finish(() => resolve())
        return
      }
      finish(() => reject(new Error(`Turnstile 脚本加载超时（>${SCRIPT_LOAD_TIMEOUT_MS / 1000}s），请检查网络是否能访问 challenges.cloudflare.com`)))
    }, SCRIPT_LOAD_TIMEOUT_MS)
  }).catch((err) => {
    // 失败后清空缓存，允许后续重试
    scriptLoadPromise = null
    throw err
  })

  return scriptLoadPromise
}

const props = withDefaults(defineProps<{
  siteKey: string
  theme?: 'auto' | 'light' | 'dark'
  size?: 'normal' | 'flexible' | 'compact'
  action?: string
}>(), {
  theme: 'auto',
  size: 'flexible',
  action: undefined
})

const emit = defineEmits<{
  verified: [token: string]
  expired: []
  error: [message: string]
}>()

const token = defineModel<string>('token', { default: '' })

const container = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const hasRenderedWidget = ref(false)
const loadError = ref('')
const shouldShowPlaceholder = computed(() => !hasRenderedWidget.value && !loadError.value)
const widgetState = computed(() => {
  if (loadError.value) return 'error'
  return shouldShowPlaceholder.value ? 'loading' : 'ready'
})

function reportError(message: string) {
  loadError.value = message
  emit('error', message)
}

function clearError() {
  loadError.value = ''
}

function renderWidget() {
  if (!container.value) {
    return
  }
  const turnstile = (window as TurnstileWindow).turnstile
  if (!turnstile) {
    return
  }
  if (!props.siteKey) {
    reportError('Turnstile siteKey 为空，请到后台设置中检查 Turnstile 配置')
    return
  }
  // 已有 widget 时先移除避免重复
  if (widgetId.value) {
    try {
      turnstile.remove(widgetId.value)
    } catch { /* noop */ }
    widgetId.value = null
    hasRenderedWidget.value = false
  }
  const opts: Record<string, unknown> = {
    'sitekey': props.siteKey,
    'theme': props.theme,
    'size': props.size,
    'callback': (value: string) => {
      token.value = value
      clearError()
      emit('verified', value)
    },
    'expired-callback': () => {
      token.value = ''
      emit('expired')
    },
    'error-callback': (err: unknown) => {
      token.value = ''
      hasRenderedWidget.value = true
      const message = String(err ?? 'turnstile_error')
      // Cloudflare 错误码参考 https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/
      reportError(`Turnstile 校验失败：${message}`)
    }
  }
  if (props.action) {
    opts.action = props.action
  }
  const id = turnstile.render(container.value, opts) || null
  widgetId.value = id
  hasRenderedWidget.value = Boolean(id) || container.value.childElementCount > 0
  if (!hasRenderedWidget.value) {
    reportError('Turnstile widget 渲染失败，请检查 siteKey 是否与当前域名匹配')
  } else {
    clearError()
  }
}

function resetWidget() {
  token.value = ''
  const turnstile = (window as TurnstileWindow).turnstile
  if (turnstile && widgetId.value) {
    turnstile.reset(widgetId.value)
  }
}

defineExpose({ reset: resetWidget })

onMounted(async () => {
  try {
    await loadScript()
    renderWidget()
  } catch (err) {
    reportError(err instanceof Error ? err.message : 'Turnstile 脚本加载失败')
  }
})

onBeforeUnmount(() => {
  const turnstile = (window as TurnstileWindow).turnstile
  if (turnstile && widgetId.value) {
    try {
      turnstile.remove(widgetId.value)
    } catch { /* noop */ }
    widgetId.value = null
  }
})

watch(() => props.siteKey, () => {
  if (widgetId.value) {
    renderWidget()
  }
})
</script>

<template>
  <div
    class="turnstile-widget"
    :data-size="size"
    :data-state="widgetState"
  >
    <div
      ref="container"
      class="cf-turnstile turnstile-widget__container"
    />
    <div
      v-if="shouldShowPlaceholder"
      class="turnstile-widget__placeholder"
      aria-hidden="true"
    >
      <span class="turnstile-widget__checkbox" />
      <span class="turnstile-widget__lines">
        <span />
        <span />
      </span>
    </div>
  </div>
</template>

<style scoped>
.turnstile-widget {
  --turnstile-width: 100%;
  --turnstile-height: 65px;

  position: relative;
  display: grid;
  place-items: center;
  width: var(--turnstile-width);
  min-height: var(--turnstile-height);
  margin-inline: auto;
  overflow: hidden;
}

.turnstile-widget[data-size="normal"] {
  --turnstile-width: min(100%, 300px);
}

.turnstile-widget[data-size="compact"] {
  --turnstile-width: 150px;
  --turnstile-height: 140px;
}

.turnstile-widget[data-state="error"] {
  height: 0;
  min-height: 0;
}

.turnstile-widget__container {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: var(--turnstile-height);
}

.turnstile-widget[data-size="flexible"] .turnstile-widget__container :deep(> *),
.turnstile-widget[data-size="flexible"] .turnstile-widget__container :deep(iframe) {
  width: 100% !important;
  max-width: 100%;
}

.turnstile-widget[data-state="error"] .turnstile-widget__container {
  display: none;
  min-height: 0;
}

.turnstile-widget__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--dashboard-radius);
  background: color-mix(in oklab, var(--ui-bg-elevated) 86%, var(--ui-bg) 14%);
  padding: 0.75rem;
  pointer-events: none;
}

.turnstile-widget__checkbox {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--ui-border-accented);
  background: var(--ui-bg);
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 36%, transparent);
}

.turnstile-widget__lines {
  display: grid;
  flex: 1;
  gap: 0.375rem;
}

.turnstile-widget__lines span {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--dashboard-skeleton-base);
}

.turnstile-widget__lines span:first-child {
  width: 62%;
}

.turnstile-widget__lines span:last-child {
  width: 42%;
}

.dark .turnstile-widget__placeholder {
  background: color-mix(in oklab, var(--ui-bg-elevated) 72%, var(--ui-bg) 28%);
}
</style>
