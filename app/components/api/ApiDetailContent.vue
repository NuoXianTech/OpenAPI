<script setup lang="ts">
import { isSafePublicUrl } from '#shared/utils/safe-url'

import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import { formatCompactCount } from '~/utils/number-format'
import {
  areAllApiMethodsPaid,
  getAggregateApiMethodCost,
  getApiMethodCost
} from '~/utils/api-presentation'

interface ApiDetailContentProps {
  description?: string
  apiPath: string
  docUrl?: string
  isApiKey: boolean
  methods: string[]
  methodCosts: Record<string, number>
  totalCalls: number
}

const props = withDefaults(defineProps<ApiDetailContentProps>(), {
  description: '',
  docUrl: ''
})

const safeDocUrl = computed(() => isSafePublicUrl(props.docUrl, { allowRelative: true }) ? props.docUrl : '')

const {
  description,
  apiPath,
  isApiKey,
  methods,
  methodCosts,
  totalCalls
} = toRefs(props)
const { t, locale } = useI18n()
const { copyText } = useCopyFeedback()
const requestUrl = useRequestURL()
const aggregateCost = computed(() => getAggregateApiMethodCost(methods.value, methodCosts.value))
const isAllPaid = computed(() => areAllApiMethodsPaid(methods.value, methodCosts.value))
const endpointUrl = computed(() => {
  try {
    return new URL(apiPath.value, `${requestUrl.origin}/`).toString()
  } catch {
    return apiPath.value
  }
})
const pricingSummary = computed(() => {
  if (aggregateCost.value > 0) {
    return t('public.api.pricing.pointsPerCall', { count: aggregateCost.value })
  }
  if (aggregateCost.value === -1) {
    return isAllPaid.value
      ? t('public.api.pricing.byMethod')
      : t('public.api.pricing.partiallyPaid')
  }
  return t('public.api.pricing.free')
})

function costFor(method: string): number {
  return getApiMethodCost(method, methodCosts.value)
}

async function copyEndpoint() {
  await copyText(endpointUrl.value)
}
</script>

<template>
  <div class="api-detail">
    <section class="api-detail__request">
      <span class="api-detail__section-label">
        <UIcon name="i-mdi-routes" class="size-3.5" />
        {{ $t('public.api.endpoint') }}
      </span>

      <div class="api-detail__request-line">
        <div
          class="api-detail__request-methods"
          :aria-label="$t('public.api.requestMethod')"
        >
          <ApiHttpMethodBadge
            v-for="method in methods"
            :key="`request-${method}`"
            :method="method"
          />
        </div>

        <div class="api-detail__request-target">
          <UTooltip
            :text="endpointUrl"
            :content="{ side: 'top' }"
          >
            <code>{{ apiPath }}</code>
          </UTooltip>
          <UTooltip
            :text="$t('public.api.copyEndpoint')"
            :content="{ side: 'top' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-mdi-content-copy"
              class="api-detail__copy-button"
              :aria-label="$t('public.api.copyEndpoint')"
              @click="copyEndpoint"
            >
              {{ $t('common.actions.copy') }}
            </UButton>
          </UTooltip>
        </div>
      </div>
    </section>

    <div class="api-detail__facts">
      <div class="api-detail__fact">
        <span class="api-detail__fact-label">
          <UIcon
            :name="isApiKey ? 'i-mdi-key-outline' : 'i-mdi-lock-open-outline'"
            class="size-3.5"
          />
          {{ $t('public.api.authentication') }}
        </span>
        <strong>{{ isApiKey ? $t('public.api.apiKey') : $t('public.api.noApiKey') }}</strong>
      </div>

      <UTooltip
        :text="$t('public.api.callCountDescription', { count: totalCalls.toLocaleString(locale) })"
        :content="{ side: 'top' }"
      >
        <div class="api-detail__fact">
          <span class="api-detail__fact-label">
            <UIcon name="i-mdi-pulse" class="size-3.5" />
            {{ $t('public.api.callCount') }}
          </span>
          <strong>{{ $t('public.api.times', { count: formatCompactCount(totalCalls, locale) }) }}</strong>
        </div>
      </UTooltip>
    </div>

    <section class="api-detail__section">
      <header class="api-detail__section-header">
        <span class="api-detail__section-label">
          <UIcon name="i-mdi-code-tags" class="size-3.5" />
          {{ $t('public.api.methodPricing') }}
        </span>
        <span class="api-detail__pricing-summary">{{ pricingSummary }}</span>
      </header>

      <div class="api-detail__method-list">
        <div
          v-for="method in methods"
          :key="`pricing-${method}`"
          class="api-detail__method-row"
        >
          <ApiHttpMethodBadge :method="method" />
          <span class="api-detail__method-connector" aria-hidden="true" />
          <span
            class="api-detail__method-cost"
            :class="{ 'is-paid': costFor(method) > 0 }"
          >
            {{ costFor(method) > 0
              ? $t('public.api.pricing.pointsPerCall', { count: costFor(method) })
              : $t('public.api.pricing.free') }}
          </span>
        </div>
      </div>
    </section>

    <section
      v-if="description"
      class="api-detail__section api-detail__description-section"
    >
      <span class="api-detail__section-label">
        <UIcon name="i-mdi-text-box-outline" class="size-3.5" />
        {{ $t('public.api.descriptionLabel') }}
      </span>
      <p class="api-detail__description">
        {{ description }}
      </p>
    </section>

    <footer
      v-if="safeDocUrl"
      class="api-detail__footer"
    >
      <UButton
        :to="safeDocUrl"
        target="_blank"
        rel="noopener noreferrer"
        size="md"
        trailing-icon="i-mdi-arrow-top-right"
        class="api-detail__doc-button"
      >
        {{ $t('public.api.openDocumentation') }}
      </UButton>
    </footer>
  </div>
</template>

<style scoped>
.api-detail {
  background: var(--ui-bg-elevated);
}

.api-detail__request {
  display: grid;
  gap: 0.625rem;
  padding: 1.25rem 1.5rem;
}

.api-detail__section-label,
.api-detail__fact-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
  font-weight: 650;
  letter-spacing: 0.035em;
  line-height: 1rem;
  text-transform: uppercase;
}

.api-detail__section-label :deep(svg),
.api-detail__fact-label :deep(svg) {
  color: var(--ui-text-dimmed);
}

.api-detail__request-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.625rem;
  padding: 0.75rem;
  background: var(--ui-bg-inverted);
  color: var(--ui-text-inverted);
}

.api-detail__request-methods {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.api-detail__request-target {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
}

.api-detail__request-target code {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: inherit;
  font-family: var(--font-code);
  font-size: 0.8125rem;
  font-weight: 520;
  line-height: 1.5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-detail__copy-button {
  flex: 0 0 auto;
  background: color-mix(in oklab, var(--ui-text-inverted) 9%, transparent);
  color: var(--ui-text-inverted);
}

.api-detail__copy-button:hover {
  background: color-mix(in oklab, var(--ui-text-inverted) 15%, transparent);
}

.api-detail__copy-button:focus-visible {
  outline: 1px solid color-mix(in oklab, var(--ui-text-inverted) 48%, transparent);
  outline-offset: 2px;
  box-shadow: none;
}

.api-detail__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-block: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-muted) 42%, transparent);
}

.api-detail__fact {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  padding: 1rem 1.5rem;
}

.api-detail__fact + .api-detail__fact {
  border-left: 1px solid var(--ui-border);
}

.api-detail__fact strong {
  overflow: hidden;
  color: var(--ui-text-highlighted);
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 680;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-detail__section {
  display: grid;
  gap: 0.875rem;
  padding: 1.25rem 1.5rem;
}

.api-detail__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.api-detail__pricing-summary {
  flex: 0 0 auto;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1rem;
}

.api-detail__method-list {
  overflow: hidden;
  border-block: 1px solid var(--ui-border);
}

.api-detail__method-row {
  display: grid;
  grid-template-columns: auto minmax(1.5rem, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 3rem;
  padding-block: 0.625rem;
}

.api-detail__method-row + .api-detail__method-row {
  border-top: 1px solid color-mix(in oklab, var(--ui-border) 72%, transparent);
}

.api-detail__method-connector {
  height: 0;
  border-top: 1px dashed color-mix(in oklab, var(--ui-border-accented) 72%, transparent);
}

.api-detail__method-cost {
  color: var(--ui-text-toned);
  font-family: var(--font-code);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1rem;
  white-space: nowrap;
}

.api-detail__method-cost.is-paid {
  color: var(--ui-text-highlighted);
}

.api-detail__description-section {
  border-top: 1px solid var(--ui-border);
}

.api-detail__description {
  margin: 0;
  color: var(--ui-text-toned);
  font-size: 0.875rem;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.api-detail__footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--ui-border);
  padding: 1rem 1.5rem calc(1rem + env(safe-area-inset-bottom));
  background: color-mix(in oklab, var(--ui-bg-muted) 42%, transparent);
}

@media (max-width: 639px) {
  .api-detail__request,
  .api-detail__section {
    padding: 1rem;
  }

  .api-detail__request-line {
    display: grid;
    gap: 0.75rem;
  }

  .api-detail__request-methods {
    width: 100%;
  }

  .api-detail__request-target {
    width: 100%;
    border-top: 1px solid color-mix(in oklab, var(--ui-text-inverted) 18%, transparent);
    padding-top: 0.75rem;
  }

  .api-detail__copy-button {
    padding-inline: 0.5rem;
  }

  .api-detail__fact {
    padding: 0.875rem 1rem;
  }

  .api-detail__section-header {
    align-items: flex-start;
  }

  .api-detail__method-row {
    gap: 0.625rem;
  }

  .api-detail__footer {
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
  }

  .api-detail__doc-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
