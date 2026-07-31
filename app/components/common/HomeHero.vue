<script setup lang="ts">
import { USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'
import { formatCompactCount } from '~/utils/number-format'

interface Props {
  startTime?: string
  siteName?: string
  siteDescription?: string
  totalCount?: number
  normalCount?: number
  callCount?: number
  apiListLoading?: boolean
  apiListError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  startTime: '',
  siteName: 'OpenAPI',
  siteDescription: '',
  totalCount: 0,
  normalCount: 0,
  callCount: 0,
  apiListLoading: false,
  apiListError: false
})

const { t, locale } = useI18n()
const { user } = useAuth()
const toast = useToast()
const requestUrl = useRequestURL()

const resolvedDescription = computed(() => props.siteDescription || t('public.home.defaultDescription'))
const compactCallCount = computed(() => formatCompactCount(props.callCount, locale.value))
const samplePath = '/v1/exchange-rate?currency=CNY&encoding=json'
const sampleUrl = computed(() => `${requestUrl.origin}${samplePath}`)
const isRunning = ref(false)
const hasResponse = ref(true)

const primaryAction = computed(() => user.value
  ? { label: t('public.home.userDashboard'), to: USER_OVERVIEW_PATH, icon: 'i-lucide-layout-dashboard' }
  : { label: t('public.navigation.getStarted'), to: '/register', icon: 'i-lucide-key-round' })

const responsePreview = computed(() => locale.value.startsWith('zh')
  ? `{
  "code": "OK",
  "message": "获取汇率成功",
  "data": {
    "base": "CNY",
    "rates": { "USD": 0.1392, "JPY": 20.61 }
  }
}`
  : `{
  "code": "OK",
  "message": "Exchange rates retrieved",
  "data": {
    "base": "CNY",
    "rates": { "USD": 0.1392, "JPY": 20.61 }
  }
}`)

async function runSample(): Promise<void> {
  if (isRunning.value) return
  isRunning.value = true
  hasResponse.value = false
  await new Promise(resolve => setTimeout(resolve, 620))
  hasResponse.value = true
  isRunning.value = false
}

async function copyRequest(): Promise<void> {
  try {
    await navigator.clipboard.writeText(sampleUrl.value)
    toast.add({ title: t('common.feedback.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('common.feedback.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <section class="platform-hero">
    <div class="platform-hero__grid" aria-hidden="true" />

    <div class="platform-hero__inner">
      <div class="platform-hero__copy">
        <div class="platform-hero__availability">
          <strong>{{ siteName }}</strong>
          <span aria-hidden="true">·</span>
          <UIcon
            :name="apiListError ? 'i-lucide-circle-alert' : apiListLoading ? 'i-lucide-loader-circle' : 'i-lucide-circle-check'"
            class="size-3.5"
            :class="{ 'is-error': apiListError, 'is-loading': apiListLoading }"
          />
          <span v-if="apiListError">{{ $t('common.states.loadFailed') }}</span>
          <span v-else-if="apiListLoading">{{ $t('common.states.loading') }}</span>
          <span v-else>{{ normalCount }} / {{ totalCount }} {{ $t('public.home.availableApis') }}</span>
        </div>

        <h1>
          {{ $t('public.home.heroTitle') }}
        </h1>

        <p class="platform-hero__description">
          {{ resolvedDescription }}
        </p>

        <div class="platform-hero__actions">
          <UButton :to="primaryAction.to" size="lg" :icon="primaryAction.icon">
            {{ primaryAction.label }}
          </UButton>
          <UButton
            to="#api-catalog"
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-book-open"
          >
            {{ $t('public.navigation.catalog') }}
          </UButton>
        </div>

        <dl class="platform-hero__metrics">
          <div>
            <dt>{{ $t('public.home.totalCalls') }}</dt>
            <dd :title="callCount.toLocaleString(locale)">
              {{ compactCallCount }}
            </dd>
          </div>
          <div>
            <dt>{{ $t('public.home.totalApis') }}</dt>
            <dd>{{ totalCount }}</dd>
          </div>
          <div>
            <dt>{{ $t('public.home.availableApis') }}</dt>
            <dd>{{ normalCount }}</dd>
          </div>
        </dl>
      </div>

      <div class="api-playground" :aria-label="$t('public.home.liveExample')">
        <div class="api-playground__header">
          <div class="api-playground__title">
            <span class="api-playground__status" aria-hidden="true" />
            <span>{{ $t('public.home.liveExample') }}</span>
          </div>
          <span class="api-playground__endpoint">exchange-rate</span>
        </div>

        <div class="api-playground__request">
          <span class="api-playground__label">{{ $t('public.home.requestAddress') }}</span>
          <div class="api-playground__address">
            <span>GET</span>
            <code>{{ sampleUrl }}</code>
            <UTooltip :text="$t('common.actions.copy')">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                icon="i-lucide-copy"
                :aria-label="$t('common.actions.copy')"
                @click="copyRequest"
              />
            </UTooltip>
          </div>
          <UButton
            size="sm"
            icon="i-lucide-play"
            :loading="isRunning"
            :disabled="isRunning"
            class="self-start"
            @click="runSample"
          >
            {{ $t('public.home.sendRequest') }}
          </UButton>
        </div>

        <div class="api-playground__response">
          <div class="api-playground__response-head">
            <span>{{ $t('public.home.responsePreview') }}</span>
            <span v-if="hasResponse && !isRunning" class="api-playground__ok">200 OK · 86ms</span>
          </div>
          <pre><code>{{ isRunning ? $t('public.home.requesting') : responsePreview }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.platform-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.platform-hero__grid {
  display: none;
}

.platform-hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: calc(100% - 2rem);
  max-width: 1180px;
  margin-inline: auto;
  gap: 3.5rem;
  padding-block: 4rem;
}

.platform-hero__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.platform-hero__availability {
  display: inline-flex;
  min-height: 1.25rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.platform-hero__availability .iconify { color: var(--ui-success); }
.platform-hero__availability strong { color: var(--ui-text-highlighted); font-weight: 650; }
.platform-hero__availability .is-error { color: var(--ui-error); }
.platform-hero__availability .is-loading { color: var(--ui-warning); animation: spin 1s linear infinite; }

.platform-hero h1 {
  max-width: 40rem;
  margin-top: 1.5rem;
  color: var(--ui-text-highlighted);
  font-size: 2.65rem;
  font-weight: 650;
  line-height: 1.1;
}

.platform-hero__description {
  max-width: 35rem;
  margin-top: 1.25rem;
  color: var(--ui-text-muted);
  font-size: 1rem;
  line-height: 1.75;
}

.platform-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.platform-hero__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  margin-top: 2rem;
  padding-top: 0.25rem;
}

.platform-hero__metrics div { min-width: 4.5rem; }
.platform-hero__metrics dt { color: var(--ui-text-muted); font-size: 0.7rem; }
.platform-hero__metrics dd { margin-top: 0.25rem; color: var(--ui-text-highlighted); font: 650 1.05rem var(--font-code); }

.api-playground {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  box-shadow:
    0 0 0 16px var(--ui-bg-muted),
    0 20px 48px -42px color-mix(in oklab, var(--brand-ink) 32%, transparent);
}

.api-playground__header,
.api-playground__response-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.api-playground__header {
  min-height: 3rem;
  border-bottom: 1px solid var(--ui-border);
  padding: 0.625rem 1rem;
}

.api-playground__title { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 650; }
.api-playground__status { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--ui-success); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-success) 12%, transparent); }
.api-playground__endpoint { overflow: hidden; border: 1px solid var(--ui-border); border-radius: 6px; padding: 0.25rem 0.5rem; color: var(--ui-text-muted); background: var(--ui-bg-muted); font: 0.65rem var(--font-code); text-overflow: ellipsis; white-space: nowrap; }

.api-playground__request { display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid var(--ui-border); padding: 1rem; background: color-mix(in oklab, var(--ui-bg-muted) 60%, var(--ui-bg-elevated)); }
.api-playground__label { color: var(--ui-text-muted); font-size: 0.7rem; }
.api-playground__address { display: flex; min-width: 0; min-height: 2.5rem; align-items: center; gap: 0.65rem; border: 1px solid var(--ui-border); border-radius: 7px; padding: 0.25rem 0.35rem 0.25rem 0.75rem; background: var(--ui-bg-elevated); }
.api-playground__address > span { color: var(--ui-text-highlighted); font: 700 0.7rem var(--font-code); }
.api-playground__address code { min-width: 0; flex: 1; overflow-x: auto; color: var(--ui-text-toned); font-size: 0.68rem; white-space: nowrap; scrollbar-width: none; }

.api-playground__response { padding: 1rem; }
.api-playground__response-head { margin-bottom: 0.625rem; color: var(--ui-text-muted); font-size: 0.7rem; }
.api-playground__ok { color: var(--ui-success); font-family: var(--font-code); }
.api-playground pre { height: 15rem; margin: 0; overflow: auto; border-radius: 7px; padding: 0.875rem; color: var(--ui-text-toned); background: var(--ui-bg-muted); font-size: 0.7rem; line-height: 1.65; }

@media (width >= 960px) {
  .platform-hero__inner { grid-template-columns: minmax(0, 1fr) minmax(420px, 520px); align-items: center; padding-block: 5.25rem; }
}

@media (width < 640px) {
  .platform-hero__inner { gap: 2.25rem; padding-block: 2.75rem; }
  .platform-hero h1 { margin-top: 1.25rem; font-size: 2rem; }
  .platform-hero__description { margin-top: 1rem; font-size: 0.875rem; line-height: 1.65; }
  .platform-hero__actions { width: 100%; margin-top: 1.35rem; }
  .platform-hero__actions :deep(a) { flex: 1 1 auto; }
  .platform-hero__metrics { width: 100%; justify-content: space-between; gap: 1rem; margin-top: 1.5rem; }
  .api-playground { box-shadow: 0 0 0 8px var(--ui-bg-muted); }
  .api-playground pre { height: 12rem; }
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
