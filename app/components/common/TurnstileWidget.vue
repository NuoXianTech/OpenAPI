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
const loadError = ref('')

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
  if (!id) {
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
    ref="container"
    class="cf-turnstile"
  />
</template>
