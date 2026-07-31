<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'
import { formatCompactCount } from '~/utils/number-format'

type ApiCardBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

interface ApiCardProps {
  name?: string
  status?: number
  shortDesc?: string
  description?: string
  httpMethod?: string
  apiPath?: string
  docUrl?: string
  isApiKey?: boolean
  methodCosts?: Record<string, number>
  totalCalls?: number
}

interface ApiCardStatusMeta {
  label: string
  color: ApiCardBadgeColor
  icon: string
}

const props = withDefaults(defineProps<ApiCardProps>(), {
  name: '',
  status: API_STATUS.unknown,
  shortDesc: '',
  description: '',
  httpMethod: 'GET',
  apiPath: '/v1/path',
  docUrl: '',
  isApiKey: false,
  methodCosts: () => ({}),
  totalCalls: 0
})
const { t, locale } = useI18n()
const {
  name,
  shortDesc,
  description,
  apiPath,
  docUrl,
  isApiKey,
  totalCalls
} = toRefs(props)
const resolvedName = computed(() => name.value || t('public.api.defaultTitle'))
const popoverDetailsOpen = ref(false)
const modalDetailsOpen = ref(false)
const methods = computed(() => parseMethods(props.httpMethod))
const isAllPaid = computed(() => methods.value.length > 0 && methods.value.every(method => costFor(method) > 0))
const aggregateCost = computed(() => {
  if (methods.value.length === 0) return 0
  const prices = methods.value.map(costFor)
  const first = prices[0]!
  return prices.every(price => price === first) ? first : -1
})
const pricingTooltip = computed(() => {
  if (aggregateCost.value > 0) return t('public.api.pricing.perCall', { count: aggregateCost.value })
  if (aggregateCost.value === -1) {
    return isAllPaid.value ? t('public.api.pricing.byMethodDescription') : t('public.api.pricing.partiallyPaidDescription')
  }
  return t('public.api.pricing.freeDescription')
})
const isDetailsOpen = computed(() => popoverDetailsOpen.value || modalDetailsOpen.value)
const detailSummary = computed(() => shortDesc.value || description.value || t('public.api.noSummary'))
const radarMeta = computed(() => getSuccessRadar(props.status))
const radarClass = computed(() => radarMeta.value.className)
const radarTitle = computed(() => radarMeta.value.title)
const statusMeta = computed(() => getStatusMeta(props.status))
const statusSurfaceClass = computed(() => `api-card--status-${statusMeta.value.color}`)
const detailContentProps = computed(() => ({
  name: resolvedName.value,
  shortDesc: shortDesc.value,
  description: description.value,
  apiPath: apiPath.value,
  docUrl: docUrl.value,
  isApiKey: isApiKey.value,
  methods: methods.value,
  methodCosts: props.methodCosts,
  totalCalls: totalCalls.value,
  statusMeta: statusMeta.value
}))

function parseMethods(value = 'GET'): string[] {
  return value
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
}

function costFor(method: string): number {
  const value = props.methodCosts?.[method.toUpperCase()]
  return typeof value === 'number' && value > 0 ? value : 0
}

function getSuccessRadar(status = -1): { className: string, title: string } {
  switch (status) {
    case API_STATUS.normal:
      return { className: '', title: t('common.states.active') }
    case API_STATUS.abnormal:
      return { className: 'is-error', title: t('common.states.inactive') }
    default:
      return { className: 'is-unknown', title: t('common.states.unknown') }
  }
}

function getStatusMeta(status = -1): ApiCardStatusMeta {
  switch (status) {
    case API_STATUS.normal:
      return { label: t('common.states.active'), color: 'success', icon: 'i-mdi-check-circle-outline' }
    case API_STATUS.abnormal:
      return { label: t('common.states.inactive'), color: 'error', icon: 'i-mdi-alert-circle-outline' }
    case API_STATUS.maintenance:
      return { label: t('common.states.maintenance'), color: 'warning', icon: 'i-mdi-wrench-outline' }
    case API_STATUS.deprecated:
      return { label: t('common.states.deprecated'), color: 'neutral', icon: 'i-mdi-archive-outline' }
    case API_STATUS.automatic:
      return { label: t('common.states.automatic'), color: 'info', icon: 'i-mdi-sync' }
    default:
      return { label: t('common.states.unknown'), color: 'neutral', icon: 'i-mdi-help-circle-outline' }
  }
}
</script>

<template>
  <UCard
    variant="outline"
    class="api-card border-default bg-elevated"
    :class="[statusSurfaceClass, { 'is-active': isDetailsOpen }]"
    :ui="{ root: 'gap-0', body: '!p-0' }"
  >
    <header class="api-card__head">
      <div class="min-w-0">
        <div class="api-card__overline">
          PUBLIC ENDPOINT
        </div>
        <h3 class="api-card__title">
          {{ resolvedName }}
        </h3>
      </div>
      <span class="api-card__status" :class="radarClass">
        <span class="api-card__radar" aria-hidden="true" />
        {{ radarTitle }}
      </span>
    </header>

    <p class="api-card__short">
      {{ shortDesc || $t('public.api.noSummary') }}
    </p>

    <div class="api-card__endpoint">
      <span class="api-card__method">{{ methods.join(' / ') }}</span>
      <code>{{ apiPath }}</code>
    </div>

    <div class="api-card__toggle-row">
      <div class="api-card__footer-meta">
        <UTooltip
          :text="pricingTooltip"
          :content="{ side: 'top' }"
        >
          <UBadge
            color="warning"
            variant="soft"
            size="sm"
            :icon="aggregateCost === 0 ? 'i-mdi-check-circle-outline' : 'i-mdi-coins'"
            class="rounded-md"
            :class="{ 'api-card__price-badge api-card__price-badge--free': aggregateCost === 0 }"
          >
            <template v-if="aggregateCost > 0">
              {{ $t('public.api.pricing.pointsPerCall', { count: aggregateCost }) }}
            </template>
            <template v-else-if="aggregateCost === -1">
              {{ isAllPaid ? $t('public.api.pricing.byMethod') : $t('public.api.pricing.partiallyPaid') }}
            </template>
            <template v-else>
              {{ $t('public.api.pricing.free') }}
            </template>
          </UBadge>
        </UTooltip>
        <UTooltip
          v-if="isApiKey"
          :text="$t('public.api.apiKeyRequiredDescription')"
          :content="{ side: 'top' }"
        >
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-mdi-shield-key-outline"
            class="api-card__key-badge rounded-md"
          >
            {{ $t('public.api.apiKey') }}
          </UBadge>
        </UTooltip>
        <UTooltip
          :text="$t('public.api.totalCallsDescription', { count: totalCalls.toLocaleString(locale) })"
          :content="{ side: 'top' }"
        >
          <span class="api-card__calls">
            <span
              class="api-card__calls-icon"
              aria-hidden="true"
            >
              <UIcon
                name="i-mdi-pulse"
                class="size-3"
              />
            </span>
            <span class="api-card__calls-num">{{ $t('public.api.times', { count: formatCompactCount(totalCalls, locale) }) }}</span>
          </span>
        </UTooltip>
      </div>
      <div class="api-card__actions">
        <UTooltip
          v-if="docUrl"
          :text="$t('public.api.openDocumentation')"
          :content="{ side: 'top' }"
        >
          <UButton
            :to="docUrl"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-mdi-file-document-outline"
            class="api-card__action-button"
          >
            {{ $t('public.api.documentation') }}
          </UButton>
        </UTooltip>

        <div class="api-card__detail-desktop">
          <UPopover
            v-model:open="popoverDetailsOpen"
            arrow
            :content="{ align: 'end', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
            :ui="{ content: 'p-0 overflow-hidden' }"
          >
            <UTooltip
              :text="popoverDetailsOpen ? $t('public.api.collapseDetails') : $t('public.api.viewDetails')"
              :content="{ side: 'top' }"
            >
              <UButton
                color="neutral"
                variant="soft"
                size="xs"
                :icon="popoverDetailsOpen ? 'i-mdi-chevron-up' : 'i-mdi-arrow-top-right'"
                class="api-card__action-button"
              >
                {{ popoverDetailsOpen ? $t('public.api.collapse') : $t('public.api.details') }}
              </UButton>
            </UTooltip>

            <template #content>
              <ApiCardDetailContent
                v-bind="detailContentProps"
                variant="popover"
              />
            </template>
          </UPopover>
        </div>

        <div class="api-card__detail-mobile">
          <UModal
            v-model:open="modalDetailsOpen"
            :ui="{
              content: 'max-sm:left-0 max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-lg max-sm:max-h-[88dvh] sm:max-w-md overflow-hidden',
              header: 'items-start gap-3 border-b border-default py-3 ps-4 pe-12 sm:ps-5 sm:pe-12',
              wrapper: 'min-w-0',
              title: 'min-w-0',
              description: 'block',
              close: 'top-3 end-3',
              body: 'p-0 sm:p-0 overflow-hidden'
            }"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              trailing-icon="i-mdi-chevron-right"
              class="api-card__action-button"
            >
              {{ $t('public.api.details') }}
            </UButton>

            <template #title>
              <div class="api-card__modal-title-row">
                <span
                  class="api-card__modal-icon"
                  aria-hidden="true"
                >
                  <UIcon
                    name="i-mdi-api"
                    class="size-4"
                  />
                </span>
                <span class="api-card__modal-title">{{ resolvedName }}</span>
                <UBadge
                  :color="statusMeta.color"
                  variant="soft"
                  size="sm"
                  :icon="statusMeta.icon"
                  class="shrink-0 rounded-full"
                >
                  {{ statusMeta.label }}
                </UBadge>
              </div>
            </template>

            <template #description>
              <span class="api-card__modal-summary">{{ detailSummary }}</span>
            </template>

            <template #body>
              <ApiCardDetailContent
                v-bind="detailContentProps"
                variant="modal"
              />
            </template>
          </UModal>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.api-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  --api-card-status: var(--ui-text-dimmed);
  isolation: isolate;
  height: 100%;
  transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

.api-card::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 110px;
  height: 110px;
  background: radial-gradient(circle at top right, color-mix(in srgb, var(--api-card-status) 18%, transparent), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.api-card--status-success { --api-card-status: var(--ui-success); }
.api-card--status-error { --api-card-status: var(--ui-error); }
.api-card--status-warning { --api-card-status: var(--ui-warning); }
.api-card--status-info { --api-card-status: var(--ui-info); }
.api-card--status-neutral { --api-card-status: var(--ui-text-dimmed); }

.api-card:hover {
  transform: translateY(-2px);
}

.api-card.is-active {
  border-color: color-mix(in srgb, var(--ui-primary) 42%, var(--ui-border));
  box-shadow: 0 14px 30px -22px color-mix(in srgb, var(--ui-primary) 44%, transparent);
}

:global(.dark) .api-card--status-success { --api-card-status: var(--ui-success); }
.api-card--status-error { --api-card-status: var(--ui-error); }
.api-card--status-warning { --api-card-status: var(--ui-warning); }
.api-card--status-info { --api-card-status: var(--ui-info); }
.api-card--status-neutral { --api-card-status: var(--ui-text-dimmed); }

.api-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 0;
}

.api-card__title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.api-card__short {
  position: relative;
  z-index: 1;
  margin: 8px 16px 10px;
  font-size: 13px;
  color: var(--ui-text-muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}

.api-card__toggle-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding: 10px 16px 12px;
  border-top: 1px solid color-mix(in srgb, var(--ui-border) 68%, transparent);
  background: color-mix(in srgb, var(--ui-bg-muted) 24%, transparent);
}

.api-card__footer-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.api-card__actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

.api-card__detail-desktop {
  display: none;
}

.api-card__detail-mobile {
  display: block;
}

.api-card__action-button {
  border: 1px solid color-mix(in srgb, var(--ui-border) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-bg-muted) 72%, transparent);
  font-weight: 500;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ui-text) 5%, transparent);
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.api-card__action-button:hover {
  border-color: color-mix(in srgb, var(--ui-primary) 28%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 9%, var(--ui-bg-muted));
  box-shadow: 0 4px 10px -8px color-mix(in srgb, var(--ui-primary) 55%, transparent);
}

.api-card__radar {
  /* 状态色走语义变量：var(--ui-success/error) 自带 light/dark 切换，透明衍生色用 color-mix 取自同一变量 */
  --radar-color: var(--ui-success);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
  background: var(--radar-color);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--radar-color) 24%, transparent),
    0 0 8px color-mix(in srgb, var(--radar-color) 45%, transparent);
  flex-shrink: 0;
}

.api-card__radar::before,
.api-card__radar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--radar-color) 40%, transparent);
  animation: radarPulse 2s ease-out infinite;
}

.api-card__radar::after {
  animation-delay: 0s;
}

.api-card__radar.is-error {
  --radar-color: var(--ui-error);
}

.api-card__radar.is-unknown {
  --radar-color: var(--ui-text-dimmed);
}

.api-card__calls {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  padding: 1px 8px 1px 2px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ui-info) 22%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-info) 7%, var(--ui-bg-elevated));
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ui-text) 5%, transparent);
  color: var(--ui-text-muted);
  font-size: 11px;
  line-height: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: nowrap;
}

.api-card__calls-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-info);
  background: color-mix(in srgb, var(--ui-info) 10%, var(--ui-bg-elevated));
}

.api-card__calls-num {
  font-weight: 600;
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.api-card__calls-label {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  letter-spacing: 0.04em;
}

.api-card__price-badge,
.api-card__key-badge {
  min-height: 22px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ui-text) 4%, transparent);
  font-weight: 600;
}

.api-card__price-badge--free {
  color: var(--ui-success);
  border-color: color-mix(in srgb, var(--ui-success) 24%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-success) 7%, var(--ui-bg-elevated)) !important;
}

.api-card__key-badge {
  color: var(--ui-primary);
  border-color: color-mix(in srgb, var(--ui-primary) 20%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 6%, var(--ui-bg-elevated)) !important;
}

.api-card__modal-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-primary) 16%, var(--ui-border));
}

.api-card__modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.api-card__modal-title {
  margin: 0;
  min-width: 0;
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__modal-summary {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 12.5px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (min-width: 640px) {
  .api-card__detail-desktop {
    display: block;
  }

  .api-card__detail-mobile {
    display: none;
  }
}

@keyframes radarPulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}

/* Route-console treatment: information stays visible before opening details. */
.api-card {
  border-radius: 8px;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.api-card::after { display: none; }

.api-card:hover {
  transform: none;
  border-color: color-mix(in oklab, var(--ui-primary) 32%, var(--ui-border));
  box-shadow: 0 8px 28px -24px color-mix(in oklab, var(--ui-primary) 45%, transparent);
}

.api-card__head {
  align-items: flex-start;
  padding: 1rem 1rem 0;
}

.api-card__overline {
  margin-bottom: 0.3rem;
  color: var(--ui-text-dimmed);
  font-family: var(--font-code);
  font-size: 0.56rem;
  font-weight: 700;
}

.api-card__title {
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0;
}

.api-card__status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  padding: 0.25rem 0.45rem;
  color: var(--ui-text-muted);
  font-size: 0.62rem;
}

.api-card__status .api-card__radar {
  width: 0.4rem;
  height: 0.4rem;
  box-shadow: none;
}

.api-card__status .api-card__radar::before,
.api-card__status .api-card__radar::after { display: none; }
.api-card__status.is-error .api-card__radar { --radar-color: var(--ui-error); }
.api-card__status.is-unknown .api-card__radar { --radar-color: var(--ui-text-dimmed); }

.api-card__short {
  min-height: 2.75rem;
  margin: 0.75rem 1rem 0.8rem;
  font-size: 0.78rem;
}

.api-card__endpoint {
  display: flex;
  min-width: 0;
  margin: 0 1rem 1rem;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 0.55rem 0.625rem;
  background: color-mix(in oklab, var(--ui-bg-muted) 58%, transparent);
}

.api-card__endpoint code {
  min-width: 0;
  overflow: hidden;
  color: var(--ui-text-toned);
  font-size: 0.67rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__method {
  flex: 0 0 auto;
  color: var(--ui-primary);
  font-family: var(--font-code);
  font-size: 0.62rem;
  font-weight: 750;
}

.api-card__toggle-row {
  padding: 0.75rem 1rem;
  background: color-mix(in oklab, var(--ui-bg) 42%, transparent);
}

.api-card__action-button {
  border-radius: 6px;
  box-shadow: none;
}

.api-card__calls {
  border: 0;
  padding-right: 0.25rem;
  background: transparent;
  box-shadow: none;
}

.api-card__calls-icon { background: transparent; }

@media (max-width: 520px) {
  .api-card__toggle-row { align-items: flex-end; }
  .api-card__footer-meta { gap: 4px; }
  .api-card__action-button :deep(span:not([class])) { display: none; }
}
</style>
