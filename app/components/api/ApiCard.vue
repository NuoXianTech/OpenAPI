<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import {
  areAllApiMethodsPaid,
  getAggregateApiMethodCost,
  parseApiMethods,
  resolveApiStatusMeta
} from '~/utils/api-presentation'
import { formatCompactCount } from '~/utils/number-format'

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
const detailTriggerLabel = computed(() => `${t('public.api.viewDetails')} · ${resolvedName.value}`)
const detailsOpen = ref(false)
const detailTriggerElement = shallowRef<HTMLElement | null>(null)
const methods = computed(() => parseApiMethods(props.httpMethod))
const isAllPaid = computed(() => areAllApiMethodsPaid(methods.value, props.methodCosts))
const aggregateCost = computed(() => getAggregateApiMethodCost(methods.value, props.methodCosts))
const pricingTooltip = computed(() => {
  if (aggregateCost.value > 0) return t('public.api.pricing.perCall', { count: aggregateCost.value })
  if (aggregateCost.value === -1) {
    return isAllPaid.value ? t('public.api.pricing.byMethodDescription') : t('public.api.pricing.partiallyPaidDescription')
  }
  return t('public.api.pricing.freeDescription')
})
const detailSummary = computed(() => shortDesc.value || description.value || t('public.api.noSummary'))
const statusMeta = computed(() => resolveApiStatusMeta(props.status, key => t(key)))
const statusClass = computed(() => `api-card__status--${statusMeta.value.color}`)
const detailContentProps = computed(() => ({
  description: description.value,
  apiPath: apiPath.value,
  docUrl: docUrl.value,
  isApiKey: isApiKey.value,
  methods: methods.value,
  methodCosts: props.methodCosts,
  totalCalls: totalCalls.value
}))

function openDetails(event: Event) {
  if (event.currentTarget instanceof HTMLElement) {
    detailTriggerElement.value = event.currentTarget
  }
  detailsOpen.value = true
}

function restoreDetailTriggerFocus() {
  if (detailTriggerElement.value?.isConnected) {
    detailTriggerElement.value.focus()
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
          <ApiHttpMethodBadge
            v-for="method in methods"
            :key="method"
            :method="method"
            size="xs"
          />
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
          <button
            type="button"
            class="api-card__title-trigger"
            :aria-label="detailTriggerLabel"
            aria-haspopup="dialog"
            :aria-expanded="detailsOpen"
            @click="openDetails"
          >
            <span class="api-card__title-trigger-label">{{ resolvedName }}</span>
            <UIcon
              name="i-mdi-arrow-right"
              class="api-card__title-trigger-icon"
              aria-hidden="true"
            />
          </button>
        </h3>
        <p class="api-card__short">
          {{ detailSummary }}
        </p>
      </div>

      <div class="api-card__endpoint">
        <code>{{ apiPath }}</code>
      </div>
    </div>

    <div class="api-card__footer">
      <div class="api-card__footer-meta">
        <UTooltip
          :text="$t('public.api.totalCallsDescription', { count: totalCalls.toLocaleString(locale) })"
          :content="{ side: 'top' }"
        >
          <span class="api-card__metric">
            <UIcon name="i-mdi-trending-up" class="size-3.5" />
            {{ $t('public.api.times', { count: formatCompactCount(totalCalls, locale) }) }}
          </span>
        </UTooltip>
        <UTooltip
          :text="pricingTooltip"
          :content="{ side: 'top' }"
        >
          <span class="api-card__metric">
            <UIcon :name="aggregateCost === 0 ? 'i-mdi-check-circle-outline' : 'i-mdi-cash-multiple'" class="size-3.5" />
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
    </div>
  </UCard>

  <UModal
    v-model:open="detailsOpen"
    :ui="{
      content: 'sm:max-w-xl overflow-hidden',
      header: 'items-start gap-3 border-b border-default py-4 ps-4 pe-12 sm:ps-6 sm:pe-14',
      wrapper: 'min-w-0',
      title: 'min-w-0',
      description: 'block',
      close: 'top-4 end-4',
      body: 'p-0 sm:p-0'
    }"
    @after:leave="restoreDetailTriggerFocus"
  >
    <template #title>
      <div class="api-card__modal-title-row">
        <span
          class="api-card__modal-icon"
          aria-hidden="true"
        >
          <UIcon
            name="i-mdi-code-braces"
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
      <ApiDetailContent v-bind="detailContentProps" />
    </template>
  </UModal>
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

.api-card__status--error .api-card__status-dot { background: var(--ui-error); }
.api-card__status--warning .api-card__status-dot { background: var(--ui-warning); }

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
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__title-trigger {
  appearance: none;
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  border-radius: 4px;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  text-align: left;
}

.api-card__title-trigger-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__title-trigger-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex: 0 0 auto;
  color: var(--ui-text-dimmed);
  transition: color 160ms ease, transform 160ms ease;
}

.api-card__title-trigger:hover .api-card__title-trigger-icon {
  color: var(--ui-text-highlighted);
  transform: translateX(2px);
}

.api-card__title-trigger:focus-visible {
  outline: 1px solid var(--ui-border-accented);
  outline-offset: 4px;
}

.api-card__short {
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

.api-card__footer {
  display: flex;
  align-items: center;
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

@media (max-width: 520px) {
  .api-card__content { padding-inline: 1rem; }
  .api-card__footer { padding-inline: 1rem; }
  .api-card__footer-meta { gap: 0.75rem; }
}

@media (prefers-reduced-motion: reduce) {
  .api-card__title-trigger-icon {
    transition: none;
  }
}
</style>
