<script setup lang="ts">
import type { ApiCatalogItem } from '#shared/types/api'
import {
  areAllApiMethodsPaid,
  getAggregateApiMethodCost,
  parseApiMethods,
  resolveApiStatusMeta
} from '~/utils/api-presentation'
import { httpMethodColor } from '~/utils/http-method'
import { formatCompactCount } from '~/utils/number-format'

interface ApiDirectoryItemProps {
  api: ApiCatalogItem
  categoryName?: string
}

const props = withDefaults(defineProps<ApiDirectoryItemProps>(), {
  categoryName: ''
})

const { t, locale } = useI18n()
const popoverDetailsOpen = ref(false)
const modalDetailsOpen = ref(false)

const methods = computed(() => parseApiMethods(props.api.httpMethod))
const resolvedCategoryName = computed(() => props.categoryName || t('public.api.publicCategory'))
const resolvedSummary = computed(() => props.api.shortDesc || props.api.description || t('public.api.noSummary'))
const statusMeta = computed(() => resolveApiStatusMeta(props.api.status, key => t(key)))
const statusClass = computed(() => 'api-directory-item__status--' + statusMeta.value.color)
const aggregateCost = computed(() => getAggregateApiMethodCost(methods.value, props.api.methodCosts))
const isAllPaid = computed(() => areAllApiMethodsPaid(methods.value, props.api.methodCosts))
const pricingLabel = computed(() => {
  if (aggregateCost.value > 0) return t('public.api.pricing.pointsPerCall', { count: aggregateCost.value })
  if (aggregateCost.value === -1) {
    return isAllPaid.value ? t('public.api.pricing.byMethod') : t('public.api.pricing.partiallyPaid')
  }
  return t('public.api.pricing.free')
})
const detailContentProps = computed(() => ({
  name: props.api.name || t('public.api.defaultTitle'),
  shortDesc: props.api.shortDesc,
  description: props.api.description,
  apiPath: props.api.apiPath,
  docUrl: props.api.docUrl,
  isApiKey: props.api.isApiKey,
  methods: methods.value,
  methodCosts: props.api.methodCosts,
  totalCalls: props.api.totalCalls,
  statusMeta: statusMeta.value
}))
</script>

<template>
  <article class="api-directory-item">
    <header class="api-directory-item__topline">
      <div class="api-directory-item__endpoint">
        <UBadge
          v-for="method in methods"
          :key="method"
          :color="httpMethodColor(method)"
          variant="soft"
          size="sm"
          class="rounded-sm font-mono"
        >
          {{ method }}
        </UBadge>
        <code :title="props.api.apiPath">{{ props.api.apiPath }}</code>
      </div>

      <span
        class="api-directory-item__status"
        :class="statusClass"
      >
        <span aria-hidden="true" />
        {{ statusMeta.label }}
      </span>
    </header>

    <div class="api-directory-item__main">
      <div class="api-directory-item__copy">
        <div class="api-directory-item__title-line">
          <h2>{{ props.api.name || $t('public.api.defaultTitle') }}</h2>
          <span class="api-directory-item__category">{{ resolvedCategoryName }}</span>
          <span
            class="api-directory-item__auth"
            :class="{ 'is-required': props.api.isApiKey }"
          >
            {{ props.api.isApiKey ? $t('public.api.apiKey') : $t('public.api.noApiKey') }}
          </span>
        </div>
        <p>{{ resolvedSummary }}</p>
      </div>

      <div class="api-directory-item__aside">
        <div class="api-directory-item__metrics">
          <span>
            <UIcon name="i-lucide-trending-up" class="size-3.5" />
            {{ $t('public.api.times', { count: formatCompactCount(props.api.totalCalls, locale) }) }}
          </span>
          <span>
            <UIcon :name="aggregateCost === 0 ? 'i-lucide-circle-check' : 'i-lucide-coins'" class="size-3.5" />
            {{ pricingLabel }}
          </span>
        </div>

        <div class="api-directory-item__detail-desktop">
          <UPopover
            v-model:open="popoverDetailsOpen"
            arrow
            :content="{ align: 'end', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
            :ui="{ content: 'p-0 overflow-hidden' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              trailing-icon="i-lucide-chevron-right"
            >
              {{ $t('public.api.viewDetails') }}
            </UButton>

            <template #content>
              <ApiDetailContent
                v-bind="detailContentProps"
                variant="popover"
              />
            </template>
          </UPopover>
        </div>

        <div class="api-directory-item__detail-mobile">
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
              size="sm"
              trailing-icon="i-lucide-chevron-right"
              block
            >
              {{ $t('public.api.viewDetails') }}
            </UButton>

            <template #title>
              <span class="api-directory-item__modal-title">
                {{ props.api.name || $t('public.api.defaultTitle') }}
              </span>
            </template>

            <template #description>
              <span class="api-directory-item__modal-summary">{{ resolvedSummary }}</span>
            </template>

            <template #body>
              <ApiDetailContent
                v-bind="detailContentProps"
                variant="modal"
              />
            </template>
          </UModal>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.api-directory-item {
  display: grid;
  gap: 0.9rem;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  background: var(--ui-bg-elevated);
  transition: background-color 160ms ease;
}

.api-directory-item:hover {
  background: color-mix(in oklab, var(--ui-bg-muted) 54%, var(--ui-bg-elevated));
}

.api-directory-item__topline {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.api-directory-item__endpoint {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.api-directory-item__endpoint code {
  min-width: 0;
  overflow: hidden;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-directory-item__status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  color: var(--ui-text-muted);
  font-size: 0.7rem;
  white-space: nowrap;
}

.api-directory-item__status > span {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--ui-text-dimmed);
}

.api-directory-item__status--success > span { background: var(--ui-success); }
.api-directory-item__status--error > span { background: var(--ui-error); }
.api-directory-item__status--warning > span { background: var(--ui-warning); }
.api-directory-item__status--info > span { background: var(--ui-info); }

.api-directory-item__main {
  display: grid;
  min-width: 0;
  gap: 1.25rem;
}

.api-directory-item__copy {
  min-width: 0;
}

.api-directory-item__title-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.api-directory-item h2 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: 0.95rem;
  font-weight: 650;
  line-height: 1.4;
}

.api-directory-item__category,
.api-directory-item__auth {
  display: inline-flex;
  min-height: 1.35rem;
  align-items: center;
  border-radius: 5px;
  padding-inline: 0.45rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  font-size: 0.625rem;
  line-height: 1;
}

.api-directory-item__auth {
  border: 1px solid var(--ui-border);
  background: transparent;
}

.api-directory-item__auth.is-required {
  border-color: color-mix(in oklab, var(--ui-warning) 30%, var(--ui-border));
  color: var(--ui-warning);
}

.api-directory-item__copy > p {
  max-width: 46rem;
  margin: 0.4rem 0 0;
  overflow: hidden;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.api-directory-item__aside {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.api-directory-item__metrics {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 1rem;
}

.api-directory-item__metrics span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.api-directory-item__metrics :deep(svg) {
  color: var(--ui-text-dimmed);
}

.api-directory-item__detail-desktop {
  display: none;
  flex: 0 0 auto;
}

.api-directory-item__detail-mobile {
  display: block;
  flex: 0 0 auto;
}

.api-directory-item__modal-title {
  color: var(--ui-text-highlighted);
  font-size: 0.95rem;
  font-weight: 650;
}

.api-directory-item__modal-summary {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ui-text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (width >= 640px) {
  .api-directory-item__main {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .api-directory-item__aside {
    align-items: flex-end;
    flex-direction: column;
  }

  .api-directory-item__detail-desktop {
    display: block;
  }

  .api-directory-item__detail-mobile {
    display: none;
  }
}

@media (width < 520px) {
  .api-directory-item {
    padding-inline: 0.9rem;
  }

  .api-directory-item__topline {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .api-directory-item__endpoint {
    width: 100%;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .api-directory-item__endpoint code {
    width: 100%;
  }

  .api-directory-item__aside {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
    gap: 0.75rem;
  }

  .api-directory-item__detail-mobile {
    width: 100%;
  }
}
</style>
