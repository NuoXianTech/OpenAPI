<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'
import { formatCompactCount } from '~/utils/number-format'

type ApiCardBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

interface ApiCardProps {
  name?: string
  status?: number
  categoryName?: string
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
  categoryName: '',
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
  categoryName,
  shortDesc,
  description,
  apiPath,
  docUrl,
  isApiKey,
  totalCalls
} = toRefs(props)
const resolvedName = computed(() => name.value || t('public.api.defaultTitle'))
const resolvedCategoryName = computed(() => categoryName.value || t('public.api.publicCategory'))
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
const detailSummary = computed(() => shortDesc.value || description.value || t('public.api.noSummary'))
const statusMeta = computed(() => getStatusMeta(props.status))
const statusClass = computed(() => `api-card__status--${statusMeta.value.color}`)
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

function getStatusMeta(status = -1): ApiCardStatusMeta {
  switch (status) {
    case API_STATUS.normal:
      return { label: t('common.states.active'), color: 'success', icon: 'i-lucide-circle-check' }
    case API_STATUS.abnormal:
      return { label: t('common.states.inactive'), color: 'error', icon: 'i-lucide-circle-alert' }
    case API_STATUS.maintenance:
      return { label: t('common.states.maintenance'), color: 'warning', icon: 'i-lucide-wrench' }
    case API_STATUS.deprecated:
      return { label: t('common.states.deprecated'), color: 'neutral', icon: 'i-lucide-archive' }
    case API_STATUS.automatic:
      return { label: t('common.states.automatic'), color: 'info', icon: 'i-lucide-refresh-cw' }
    default:
      return { label: t('common.states.unknown'), color: 'neutral', icon: 'i-lucide-circle-help' }
  }
}
</script>

<template>
  <UCard
    variant="outline"
    class="api-card border-default bg-elevated"
    :ui="{ root: 'gap-0', body: '!p-0' }"
  >
    <div class="api-card__content">
      <header class="api-card__meta-row">
        <div class="api-card__badges">
          <span
            v-for="method in methods"
            :key="method"
            class="api-card__method"
            :class="`api-card__method--${method.toLowerCase()}`"
          >
            {{ method }}
          </span>
          <span class="api-card__category">
            {{ resolvedCategoryName }}
          </span>
        </div>
        <span class="api-card__status" :class="statusClass">
          <span class="api-card__status-dot" aria-hidden="true" />
          {{ statusMeta.label }}
        </span>
      </header>

      <div class="api-card__copy">
        <h3 class="api-card__title">
          <ULink
            v-if="docUrl"
            :to="docUrl"
            target="_blank"
            rel="noopener"
            class="api-card__title-link"
          >
            {{ resolvedName }}
          </ULink>
          <template v-else>
            {{ resolvedName }}
          </template>
        </h3>
        <p class="api-card__short">
          {{ shortDesc || $t('public.api.noSummary') }}
        </p>
      </div>

      <div class="api-card__endpoint">
        <code>{{ apiPath }}</code>
      </div>
    </div>

    <div class="api-card__toggle-row">
      <div class="api-card__footer-meta">
        <UTooltip
          :text="$t('public.api.totalCallsDescription', { count: totalCalls.toLocaleString(locale) })"
          :content="{ side: 'top' }"
        >
          <span class="api-card__metric">
            <UIcon name="i-lucide-trending-up" class="size-3.5" />
            {{ $t('public.api.times', { count: formatCompactCount(totalCalls, locale) }) }}
          </span>
        </UTooltip>
        <UTooltip
          :text="pricingTooltip"
          :content="{ side: 'top' }"
        >
          <span class="api-card__metric">
            <UIcon :name="aggregateCost === 0 ? 'i-lucide-circle-check' : 'i-lucide-coins'" class="size-3.5" />
            <template v-if="aggregateCost > 0">
              {{ $t('public.api.pricing.pointsPerCall', { count: aggregateCost }) }}
            </template>
            <template v-else-if="aggregateCost === -1">
              {{ isAllPaid ? $t('public.api.pricing.byMethod') : $t('public.api.pricing.partiallyPaid') }}
            </template>
            <template v-else>
              {{ $t('public.api.pricing.free') }}
            </template>
          </span>
        </UTooltip>
      </div>
      <div class="api-card__actions">
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
                variant="ghost"
                size="xs"
                square
                :icon="popoverDetailsOpen ? 'i-lucide-chevron-up' : 'i-lucide-ellipsis'"
                :aria-label="popoverDetailsOpen ? $t('public.api.collapseDetails') : $t('public.api.viewDetails')"
                class="api-card__action-button"
              />
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
              variant="ghost"
              size="xs"
              square
              icon="i-lucide-ellipsis"
              :aria-label="$t('public.api.viewDetails')"
              class="api-card__action-button"
            />

            <template #title>
              <div class="api-card__modal-title-row">
                <span
                  class="api-card__modal-icon"
                  aria-hidden="true"
                >
                  <UIcon
                    name="i-lucide-braces"
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
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
}

.api-card__content {
  padding: 1rem 1.25rem 0;
}

.api-card__meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.api-card__badges {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
}

.api-card__method,
.api-card__category,
.api-card__status {
  display: inline-flex;
  min-height: 1.35rem;
  flex: 0 0 auto;
  align-items: center;
  border: 1px solid var(--ui-border);
  border-radius: 5px;
  padding-inline: 0.42rem;
  font-size: 0.625rem;
  line-height: 1;
  white-space: nowrap;
}

.api-card__method {
  color: var(--ui-text-toned);
  font-family: var(--font-code);
  font-weight: 750;
}

.api-card__method--get {
  border-color: color-mix(in srgb, var(--ui-secondary) 34%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-secondary) 8%, transparent);
  color: var(--ui-secondary);
}

.api-card__method--post {
  border-color: color-mix(in srgb, var(--ui-secondary) 36%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-secondary) 8%, transparent);
  color: var(--ui-secondary);
}

.api-card__method--put,
.api-card__method--patch {
  border-color: color-mix(in srgb, var(--ui-warning) 36%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-warning) 8%, transparent);
  color: var(--ui-warning);
}

.api-card__method--delete {
  border-color: color-mix(in srgb, var(--ui-error) 34%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-error) 7%, transparent);
  color: var(--ui-error);
}

.api-card__category {
  max-width: 7.5rem;
  overflow: hidden;
  border-color: transparent;
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
  font-weight: 500;
  text-overflow: ellipsis;
}

.api-card__status {
  gap: 0.35rem;
  color: var(--ui-text-muted);
  font-weight: 450;
}

.api-card__status-dot {
  width: 0.38rem;
  height: 0.38rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--ui-text-dimmed);
}

.api-card__status--success .api-card__status-dot { background: var(--ui-success); }
.api-card__status--error .api-card__status-dot { background: var(--ui-error); }
.api-card__status--warning .api-card__status-dot { background: var(--ui-warning); }
.api-card__status--info .api-card__status-dot { background: var(--ui-info); }

.api-card__copy {
  margin-top: 0.75rem;
}

.api-card__title {
  margin: 0;
  overflow: hidden;
  color: var(--ui-text-highlighted);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.api-card__title-link {
  color: inherit;
  text-decoration: none;
  transition: color 160ms ease;
}

.api-card__title-link:hover {
  color: var(--ui-secondary);
}

.api-card__short {
  min-height: 2.8rem;
  margin: 0.35rem 0 0;
  overflow: hidden;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.api-card__endpoint {
  display: flex;
  min-width: 0;
  margin-top: 0.75rem;
  align-items: center;
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  background: var(--ui-bg-muted);
}

.api-card__endpoint code {
  min-width: 0;
  overflow: hidden;
  color: var(--ui-text-toned);
  font-family: var(--font-code);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  margin-top: auto;
  padding: 0.7rem 1.25rem 0.85rem;
}

.api-card__footer-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.api-card__metric {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.api-card__metric :deep(svg) {
  color: var(--ui-text-dimmed);
}

.api-card__actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
}

.api-card__detail-desktop {
  display: none;
}

.api-card__detail-mobile {
  display: block;
}

.api-card__action-button {
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-weight: 500;
  box-shadow: none;
}

.api-card__action-button:hover {
  border-color: var(--ui-border);
  background: var(--ui-bg-muted);
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

@media (max-width: 520px) {
  .api-card__content { padding-inline: 1rem; }
  .api-card__toggle-row { padding-inline: 1rem; }
  .api-card__footer-meta { gap: 0.75rem; }
}
</style>
