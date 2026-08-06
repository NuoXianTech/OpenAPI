<script setup lang="ts">
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import { USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'
import { formatCompactCount } from '~/utils/number-format'
import {
  formatExchangeRateResponseExample,
  PUBLIC_API_EXAMPLE_TIMESTAMP
} from '~/utils/public-api-example'

interface Props {
  siteDescription?: string
  totalCount?: number
  availabilityRate?: number
  callCount?: number
  successRate?: number
  userCount?: number
  summaryLoading?: boolean
  summaryError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  siteDescription: '',
  totalCount: 0,
  availabilityRate: 0,
  callCount: 0,
  successRate: 0,
  userCount: 0,
  summaryLoading: false,
  summaryError: false
})

const { t, locale } = useI18n()
const { user } = useAuth()
const toast = useToast()
const requestUrl = useRequestURL()

const resolvedDescription = computed(() => props.siteDescription || t('public.home.defaultDescription'))
const compactCallCount = computed(() => formatCompactCount(props.callCount, locale.value))
const compactUserCount = computed(() => formatCompactCount(props.userCount, locale.value))
const formattedAvailabilityRate = computed(() => props.totalCount > 0
  ? `${props.availabilityRate.toLocaleString(locale.value, { maximumFractionDigits: 2 })}%`
  : '--')
const formattedSuccessRate = computed(() => props.callCount > 0
  ? `${props.successRate.toLocaleString(locale.value, { maximumFractionDigits: 2 })}%`
  : '--')
const samplePath = '/v1/exchange-rate?currency=CNY&encoding=json'
const sampleUrl = computed(() => `${requestUrl.origin}${samplePath}`)
const isRunning = ref(false)
const hasResponse = ref(true)
const responseLatency = ref(42)
const responseTimestamp = ref(PUBLIC_API_EXAMPLE_TIMESTAMP)

const primaryAction = computed(() => user.value
  ? { label: t('public.home.userDashboard'), to: USER_OVERVIEW_PATH, icon: 'i-mdi-account-circle-outline' }
  : { label: t('public.navigation.getStarted'), to: '/register', icon: 'i-mdi-key-outline' })

const responsePreview = computed(() => formatExchangeRateResponseExample(
  t('public.home.sampleResponseMessage'),
  responseTimestamp.value
))

function createSimulatedLatency(): number {
  return Math.floor(Math.random() * 45) + 24
}

onMounted(() => {
  responseLatency.value = createSimulatedLatency()
  responseTimestamp.value = Date.now()
})

async function runSample(): Promise<void> {
  if (isRunning.value) return
  isRunning.value = true
  hasResponse.value = false
  const nextLatency = createSimulatedLatency()
  await new Promise(resolve => setTimeout(resolve, Math.max(180, nextLatency * 4)))
  responseLatency.value = nextLatency
  responseTimestamp.value = Date.now()
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
  <section class="public-api-intro" aria-labelledby="public-api-intro-title">
    <div class="public-api-intro__grid" aria-hidden="true" />

    <div class="public-api-intro__layout">
      <div class="public-api-intro__content">
        <div class="public-api-intro__status" role="status">
          <UIcon
            :name="summaryError ? 'i-mdi-alert-circle-outline' : summaryLoading ? 'i-mdi-loading' : 'i-mdi-check-circle-outline'"
            class="size-3.5"
            :class="{ 'is-error': summaryError, 'is-loading': summaryLoading }"
          />
          <span v-if="summaryError">{{ $t('common.states.loadFailed') }}</span>
          <span v-else-if="summaryLoading">{{ $t('common.states.loading') }}</span>
          <span v-else>{{ $t('public.home.availabilitySummary', { rate: formattedAvailabilityRate, users: compactUserCount }) }}</span>
        </div>

        <h1 id="public-api-intro-title" class="public-api-intro__title">
          {{ $t('public.home.introTitle') }}
        </h1>

        <p class="public-api-intro__description">
          {{ resolvedDescription }}
        </p>

        <div class="public-api-intro__actions">
          <UButton :to="primaryAction.to" size="lg" :icon="primaryAction.icon">
            {{ primaryAction.label }}
          </UButton>
          <UButton
            to="/docs"
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-mdi-book-open-page-variant-outline"
          >
            {{ $t('public.navigation.catalog') }}
          </UButton>
        </div>

        <dl class="public-api-intro__metrics">
          <div>
            <dt>{{ $t('public.home.totalCalls') }}</dt>
            <UTooltip
              :text="callCount.toLocaleString(locale)"
              :content="{ side: 'top' }"
            >
              <dd>{{ $t('public.home.callCountValue', { count: compactCallCount }) }}</dd>
            </UTooltip>
          </div>
          <div>
            <dt>{{ $t('public.home.totalApis') }}</dt>
            <dd>{{ $t('public.home.apiCountValue', { count: totalCount }) }}</dd>
          </div>
          <div>
            <dt>{{ $t('public.home.successRate') }}</dt>
            <dd>{{ formattedSuccessRate }}</dd>
          </div>
          <div>
            <dt>{{ $t('public.home.developersServed') }}</dt>
            <UTooltip
              :text="userCount.toLocaleString(locale)"
              :content="{ side: 'top' }"
            >
              <dd>{{ $t('public.home.developerCountValue', { count: compactUserCount }) }}</dd>
            </UTooltip>
          </div>
        </dl>
      </div>

      <div class="api-request-demo" :aria-label="$t('public.home.simulatedExample')">
        <div class="api-request-demo__header">
          <div class="api-request-demo__title">
            <span class="api-request-demo__status" aria-hidden="true" />
            <span>{{ $t('public.home.simulatedExample') }}</span>
          </div>
          <span class="api-request-demo__endpoint">exchange-rate</span>
        </div>

        <div class="api-request-demo__request">
          <span class="api-request-demo__label">{{ $t('public.home.requestAddress') }}</span>
          <div class="api-request-demo__address">
            <ApiHttpMethodBadge method="GET" size="xs" />
            <code>{{ sampleUrl }}</code>
            <UTooltip :text="$t('common.actions.copy')">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                icon="i-mdi-content-copy"
                :aria-label="$t('common.actions.copy')"
                @click="copyRequest"
              />
            </UTooltip>
          </div>
          <UButton
            size="sm"
            icon="i-mdi-play"
            :loading="isRunning"
            :disabled="isRunning"
            class="self-start"
            @click="runSample"
          >
            {{ $t('public.home.sendRequest') }}
          </UButton>
        </div>

        <div class="api-request-demo__response">
          <div class="api-request-demo__response-head">
            <span>{{ $t('public.home.responsePreview') }}</span>
            <span v-if="hasResponse && !isRunning" class="api-request-demo__ok">200 OK · {{ responseLatency }}ms</span>
          </div>
          <pre><code>{{ isRunning ? $t('public.home.requesting') : responsePreview }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.public-api-intro {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.public-api-intro__grid {
  display: none;
}

.public-api-intro__layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: calc(100% - 2rem);
  max-width: 1180px;
  margin-inline: auto;
  gap: 3.5rem;
  padding-block: 4rem;
}

.public-api-intro__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.public-api-intro__status {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  font-size: 0.75rem;
}

.public-api-intro__status .iconify { color: var(--ui-text-highlighted); }
.public-api-intro__status .is-error { color: var(--ui-error); }
.public-api-intro__status .is-loading { color: var(--ui-warning); animation: spin 1s linear infinite; }

.public-api-intro__title {
  width: 100%;
  max-width: 11.5em;
  margin-top: 1.5rem;
  color: var(--ui-text-highlighted);
  font-size: 2.65rem;
  font-weight: 650;
  line-height: 1.1;
}

.public-api-intro__description {
  max-width: 35rem;
  margin-top: 1.25rem;
  color: var(--ui-text-muted);
  font-size: 1rem;
  line-height: 1.75;
}

.public-api-intro__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.public-api-intro__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  margin-top: 2rem;
  padding-top: 0.25rem;
}

.public-api-intro__metrics div { min-width: 4.5rem; }
.public-api-intro__metrics dt { color: var(--ui-text-muted); font-size: 0.7rem; }
.public-api-intro__metrics dd { margin-top: 0.25rem; color: var(--ui-text-highlighted); font: 650 1.05rem var(--font-code); }

.api-request-demo {
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

.api-request-demo__header,
.api-request-demo__response-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.api-request-demo__header {
  min-height: 3rem;
  border-bottom: 1px solid var(--ui-border);
  padding: 0.625rem 1rem;
}

.api-request-demo__title { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 650; }
.api-request-demo__status { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--ui-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-primary) 10%, transparent); }
.api-request-demo__endpoint { overflow: hidden; border: 1px solid var(--ui-border); border-radius: 6px; padding: 0.25rem 0.5rem; color: var(--ui-text-muted); background: var(--ui-bg-muted); font: 0.65rem var(--font-code); text-overflow: ellipsis; white-space: nowrap; }

.api-request-demo__request { display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid var(--ui-border); padding: 1rem; background: color-mix(in oklab, var(--ui-bg-muted) 60%, var(--ui-bg-elevated)); }
.api-request-demo__label { color: var(--ui-text-muted); font-size: 0.7rem; }
.api-request-demo__address { display: flex; min-width: 0; min-height: 2.5rem; align-items: center; gap: 0.65rem; border: 1px solid var(--ui-border); border-radius: 7px; padding: 0.25rem 0.35rem 0.25rem 0.75rem; background: var(--ui-bg-elevated); }
.api-request-demo__address code { min-width: 0; flex: 1; overflow-x: auto; color: var(--ui-text-toned); font-size: 0.68rem; white-space: nowrap; scrollbar-width: none; }

.api-request-demo__response { padding: 1rem; }
.api-request-demo__response-head { margin-bottom: 0.625rem; color: var(--ui-text-muted); font-size: 0.7rem; }
.api-request-demo__ok { color: var(--ui-text-highlighted); font-family: var(--font-code); }
.api-request-demo pre { height: 15rem; margin: 0; overflow: auto; border-radius: 7px; padding: 0.875rem; color: var(--ui-text-toned); background: var(--ui-bg-muted); font-size: 0.7rem; line-height: 1.65; }

@media (width >= 960px) {
  .public-api-intro__layout { grid-template-columns: minmax(0, 1fr) minmax(420px, 500px); align-items: center; gap: 6rem; padding-block: 5.25rem; }
}

@media (width < 640px) {
  .public-api-intro__layout { gap: 2.25rem; padding-block: 2.75rem; }
  .public-api-intro__title { margin-top: 1.25rem; font-size: 2rem; }
  .public-api-intro__description { margin-top: 1rem; font-size: 0.875rem; line-height: 1.65; }
  .public-api-intro__actions { margin-top: 1.35rem; }
  .public-api-intro__metrics { width: 100%; justify-content: space-between; gap: 1rem; margin-top: 1.5rem; }
  .api-request-demo { box-shadow: 0 0 0 8px var(--ui-bg-muted); }
  .api-request-demo pre { height: 12rem; }
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
