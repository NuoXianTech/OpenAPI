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
  __turnstileOnLoadQueue?: Array<() => void>
  __turnstileOnLoad?: () => void
}

const props = withDefaults(defineProps<{
  siteKey: string
  theme?: 'auto' | 'light' | 'dark'
  size?: 'normal' | 'flexible' | 'compact'
  action?: string
}>(), {
  theme: 'auto',
  size: 'flexible',
  action: undefined,
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

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__turnstileOnLoad'

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  const w = window as TurnstileWindow
  if (w.turnstile) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    w.__turnstileOnLoadQueue = w.__turnstileOnLoadQueue || []
    w.__turnstileOnLoadQueue.push(resolve)

    if (!w.__turnstileOnLoad) {
      w.__turnstileOnLoad = () => {
        const queue = w.__turnstileOnLoadQueue || []
        w.__turnstileOnLoadQueue = []
        queue.forEach(fn => fn())
      }
    }

    if (document.querySelector(`script[src^="${SCRIPT_URL.split('?')[0]}"]`)) {
      // 已有脚本（可能其它实例正在加载），等 onload
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onerror = () => {
      loadError.value = 'Turnstile 脚本加载失败'
      reject(new Error('turnstile script load failed'))
    }
    document.head.appendChild(script)
  })
}

function renderWidget() {
  if (!container.value) {
    return
  }
  const turnstile = (window as TurnstileWindow).turnstile
  if (!turnstile) {
    return
  }
  // 已有 widget 时先移除避免重复
  if (widgetId.value) {
    try {
      turnstile.remove(widgetId.value)
    }
    catch { /* noop */ }
    widgetId.value = null
  }
  const opts: Record<string, unknown> = {
    'sitekey': props.siteKey,
    'theme': props.theme,
    'size': props.size,
    'callback': (value: string) => {
      token.value = value
      emit('verified', value)
    },
    'expired-callback': () => {
      token.value = ''
      emit('expired')
    },
    'error-callback': (err: unknown) => {
      token.value = ''
      emit('error', String(err ?? 'turnstile_error'))
    },
  }
  if (props.action) {
    opts.action = props.action
  }
  widgetId.value = turnstile.render(container.value, opts) || null
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
  }
  catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
  }
})

onBeforeUnmount(() => {
  const turnstile = (window as TurnstileWindow).turnstile
  if (turnstile && widgetId.value) {
    try {
      turnstile.remove(widgetId.value)
    }
    catch { /* noop */ }
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
  <div>
    <div
      ref="container"
      class="cf-turnstile"
    />
    <p
      v-if="loadError"
      class="text-xs text-[var(--red)] mt-1"
    >
      {{ loadError }}
    </p>
  </div>
</template>
