<script setup lang="ts">
import { TransitionPresets, usePreferredReducedMotion, useTransition } from '@vueuse/core'
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import { USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'
import { formatCompactCount } from '~/utils/number-format'
import {
  formatExchangeRateResponseExample,
  PUBLIC_API_EXAMPLE_TIMESTAMP
} from '~/utils/public-api-example'

interface Props {
  siteDescription?: string
  uptimeDays?: number | null
  totalCount?: number
  callCount?: number
  successRate?: number
  userCount?: number
  summaryLoading?: boolean
  summaryError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  siteDescription: '',
  uptimeDays: null,
  totalCount: 0,
  callCount: 0,
  successRate: 0,
  userCount: 0,
  summaryLoading: false,
  summaryError: false
})

const { t, locale } = useI18n()
const { user } = useAuth()
const { copyText } = useCopyFeedback()
const requestUrl = useRequestURL()
const preferredReducedMotion = usePreferredReducedMotion()
const metricsMounted = ref(false)
const transitionDisabled = computed(() => preferredReducedMotion.value === 'reduce')

function createAnimatedMetric() {
  const target = ref(0)
  const isAnimating = ref(false)
  const value = useTransition(target, {
    duration: 900,
    transition: TransitionPresets.easeOutCubic,
    disabled: transitionDisabled,
    onStarted: () => {
      isAnimating.value = true
    },
    onFinished: () => {
      isAnimating.value = false
    }
  })

  return { target, value, isAnimating }
}

const {
  target: callCountTarget,
  value: animatedCallCount,
  isAnimating: isCallCountAnimating
} = createAnimatedMetric()
const {
  target: totalCountTarget,
  value: animatedTotalCount,
  isAnimating: isTotalCountAnimating
} = createAnimatedMetric()
const {
  target: successRateTarget,
  value: animatedSuccessRate,
  isAnimating: isSuccessRateAnimating
} = createAnimatedMetric()
const {
  target: userCountTarget,
  value: animatedUserCount,
  isAnimating: isUserCountAnimating
} = createAnimatedMetric()

function syncAnimatedMetrics(): void {
  callCountTarget.value = Math.max(0, props.callCount)
  totalCountTarget.value = Math.max(0, props.totalCount)
  successRateTarget.value = Math.min(100, Math.max(0, props.successRate))
  userCountTarget.value = Math.max(0, props.userCount)
}

watch(
  [
    () => props.callCount,
    () => props.totalCount,
    () => props.successRate,
    () => props.userCount,
    () => props.summaryLoading,
    () => props.summaryError
  ],
  () => {
    if (!metricsMounted.value || props.summaryLoading || props.summaryError) return
    syncAnimatedMetrics()
  }
)

watch(preferredReducedMotion, (value) => {
  if (value !== 'reduce') return
  isCallCountAnimating.value = false
  isTotalCountAnimating.value = false
  isSuccessRateAnimating.value = false
  isUserCountAnimating.value = false
})

const resolvedDescription = computed(() => props.siteDescription || t('public.home.defaultDescription'))
const compactCallCount = computed(() => formatCompactCount(Math.round(animatedCallCount.value), locale.value))
const animatedApiCount = computed(() => Math.round(animatedTotalCount.value))
const compactUserCount = computed(() => formatCompactCount(Math.round(animatedUserCount.value), locale.value))
const formattedSuccessRate = computed(() => props.callCount > 0
  ? `${animatedSuccessRate.value.toLocaleString(locale.value, { maximumFractionDigits: 2 })}%`
  : '--')
const metricsStateLoading = computed(() => !metricsMounted.value || props.summaryLoading)
const uptimeDuration = computed(() => {
  const days = props.uptimeDays
  if (days === null) return ''
  if (days === 0) return t('public.home.uptimeLessThanDay')

  const duration = new Intl.NumberFormat(locale.value, {
    style: 'unit',
    unit: 'day',
    unitDisplay: 'long'
  }).format(days)
  return duration
})
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
  metricsMounted.value = true
  if (!props.summaryLoading && !props.summaryError) syncAnimatedMetrics()

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
  await copyText(sampleUrl.value)
}
</script>

<template>
  <section class="public-api-intro" aria-labelledby="public-api-intro-title">
    <div class="public-api-intro__grid" aria-hidden="true" />

    <div class="public-api-intro__layout">
      <div class="public-api-intro__content">
        <div v-if="uptimeDuration" class="public-api-intro__status-row">
          <div class="public-api-intro__status" role="status">
            <UIcon name="i-mdi-clock-outline" class="size-3.5" />
            <span>{{ $t('public.home.uptimeLabel') }}</span>
            <span class="public-api-intro__status-separator" aria-hidden="true">·</span>
            <strong>{{ uptimeDuration }}</strong>
          </div>
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

        <div
          class="public-api-intro__metrics-shell"
          :aria-busy="metricsStateLoading"
        >
          <dl class="public-api-intro__metrics">
            <div>
              <dt>{{ $t('public.home.totalCalls') }}</dt>
              <dd
                v-if="metricsStateLoading"
                class="dashboard-skeleton public-api-intro__metric-skeleton"
                aria-hidden="true"
              />
              <dd v-else-if="summaryError">
                --
              </dd>
              <UTooltip
                v-else
                :text="callCount.toLocaleString(locale)"
                :content="{ side: 'top' }"
              >
                <dd
                  class="public-api-intro__metric-value"
                  :class="{ 'is-updating': isCallCountAnimating }"
                >
                  {{ $t('public.home.callCountValue', { count: compactCallCount }) }}
                </dd>
              </UTooltip>
            </div>
            <div>
              <dt>{{ $t('public.home.totalApis') }}</dt>
              <dd
                v-if="metricsStateLoading"
                class="dashboard-skeleton public-api-intro__metric-skeleton"
                aria-hidden="true"
              />
              <dd v-else-if="summaryError">
                --
              </dd>
              <dd
                v-else
                class="public-api-intro__metric-value"
                :class="{ 'is-updating': isTotalCountAnimating }"
              >
                {{ $t('public.home.apiCountValue', { count: animatedApiCount }) }}
              </dd>
            </div>
            <div>
              <dt>{{ $t('public.home.successRate') }}</dt>
              <dd
                v-if="metricsStateLoading"
                class="dashboard-skeleton public-api-intro__metric-skeleton"
                aria-hidden="true"
              />
              <dd v-else-if="summaryError">
                --
              </dd>
              <dd
                v-else
                class="public-api-intro__metric-value"
                :class="{ 'is-updating': isSuccessRateAnimating }"
              >
                {{ formattedSuccessRate }}
              </dd>
            </div>
            <div>
              <dt>{{ $t('public.home.developersServed') }}</dt>
              <dd
                v-if="metricsStateLoading"
                class="dashboard-skeleton public-api-intro__metric-skeleton"
                aria-hidden="true"
              />
              <dd v-else-if="summaryError">
                --
              </dd>
              <UTooltip
                v-else
                :text="userCount.toLocaleString(locale)"
                :content="{ side: 'top' }"
              >
                <dd
                  class="public-api-intro__metric-value"
                  :class="{ 'is-updating': isUserCountAnimating }"
                >
                  {{ $t('public.home.developerCountValue', { count: compactUserCount }) }}
                </dd>
              </UTooltip>
            </div>
          </dl>

          <p
            v-if="summaryError && !metricsStateLoading"
            class="public-api-intro__metrics-error"
            role="alert"
          >
            <UIcon name="i-mdi-alert-circle-outline" class="size-3.5" />
            <span>{{ $t('common.states.loadFailed') }}</span>
          </p>
        </div>
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

.public-api-intro__status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
.public-api-intro__status-separator { color: var(--ui-text-dimmed); }
.public-api-intro__status strong { color: var(--ui-text-highlighted); font: 650 0.75rem var(--font-code); }

.public-api-intro__title {
  width: 100%;
  max-width: 11.5em;
  margin-top: 0;
  color: var(--ui-text-highlighted);
  font-size: 2.65rem;
  font-weight: 650;
  line-height: 1.1;
}

.public-api-intro__status-row + .public-api-intro__title { margin-top: 1.5rem; }

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

.public-api-intro__metrics-shell {
  position: relative;
  width: 100%;
  min-height: 3.5rem;
  margin-top: 2rem;
}

.public-api-intro__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  padding-top: 0.25rem;
}

.public-api-intro__metrics div { min-width: 4.5rem; }
.public-api-intro__metrics dt { color: var(--ui-text-muted); font-size: 0.7rem; }
.public-api-intro__metrics dd { margin-top: 0.25rem; color: var(--ui-text-highlighted); font: 650 1.05rem var(--font-code); }
.public-api-intro__metric-value { display: inline-block; transform-origin: left center; font-variant-numeric: tabular-nums; }
.public-api-intro__metric-value.is-updating { color: var(--ui-primary); animation: metric-tick 900ms cubic-bezier(0.22, 1, 0.36, 1); }

.public-api-intro__metric-skeleton {
  display: block;
  width: 4.5rem;
  height: 1.05rem;
  margin-top: 0.45rem;
  border-radius: 4px;
}

.public-api-intro__metrics-error {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.625rem;
  color: var(--ui-error);
  font-size: 0.75rem;
}

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
  .public-api-intro__title { font-size: 2rem; }
  .public-api-intro__status-row + .public-api-intro__title { margin-top: 1.25rem; }
  .public-api-intro__description { margin-top: 1rem; font-size: 0.875rem; line-height: 1.65; }
  .public-api-intro__actions { margin-top: 1.35rem; }
  .public-api-intro__metrics-shell { margin-top: 1.5rem; }
  .public-api-intro__metrics { width: 100%; justify-content: space-between; gap: 1rem; }
  .api-request-demo { box-shadow: 0 0 0 8px var(--ui-bg-muted); }
  .api-request-demo pre { height: 12rem; }
}

@media (prefers-reduced-motion: reduce) {
  .public-api-intro__metric-value.is-updating { animation: none; }
}

@keyframes metric-tick {
  0%, 100% { transform: translateY(0) scale(1); }
  42% { transform: translateY(-0.18rem) scale(1.035); }
}
</style>
