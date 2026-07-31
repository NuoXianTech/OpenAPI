<script setup lang="ts">
import { httpMethodColor } from '~/utils/http-method'
import { formatCompactCount } from '~/utils/number-format'
import { getApiMethodCost } from '~/utils/api-presentation'

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

const {
  description,
  apiPath,
  docUrl,
  isApiKey,
  methods,
  methodCosts,
  totalCalls
} = toRefs(props)
const { locale } = useI18n()

function costFor(method: string): number {
  return getApiMethodCost(method, methodCosts.value)
}
</script>

<template>
  <div class="api-detail">
    <div class="api-detail__body">
      <div class="api-detail__endpoint">
        <span class="api-detail__endpoint-label">
          <UIcon name="i-lucide-route" class="size-3.5" />
          {{ $t('public.api.endpoint') }}
        </span>
        <a
          :href="apiPath"
          target="_blank"
          rel="noopener noreferrer"
          :title="apiPath"
        >
          {{ apiPath }}
        </a>
      </div>

      <div class="api-detail__grid">
        <div
          class="api-detail__cell api-detail__cell--calls"
          :title="$t('public.api.callCountDescription', { count: totalCalls.toLocaleString(locale) })"
        >
          <span
            class="api-detail__icon"
            aria-hidden="true"
          >
            <UIcon
              name="i-lucide-activity"
              class="size-3.5"
            />
          </span>
          <div class="api-detail__cell-content">
            <span>{{ $t('public.api.callCount') }}</span>
            <strong>{{ formatCompactCount(totalCalls, locale) }}</strong>
          </div>
        </div>

        <div
          class="api-detail__cell"
          :class="isApiKey ? 'api-detail__cell--key' : 'api-detail__cell--free'"
        >
          <span
            class="api-detail__icon"
            aria-hidden="true"
          >
            <UIcon
              :name="isApiKey ? 'i-lucide-key-round' : 'i-lucide-lock-open'"
              class="size-3.5"
            />
          </span>
          <div class="api-detail__cell-content">
            <span>{{ $t('public.api.authentication') }}</span>
            <strong>{{ isApiKey ? $t('public.api.apiKey') : $t('public.api.noApiKey') }}</strong>
          </div>
        </div>
      </div>

      <div class="api-detail__section">
        <span class="api-detail__label api-detail__section-label">
          <UIcon name="i-lucide-code-xml" class="size-3.5" />
          {{ $t('public.api.requestMethod') }}
        </span>
        <div class="api-detail__badges">
          <UBadge
            v-for="method in methods"
            :key="method"
            :color="httpMethodColor(method)"
            variant="soft"
            size="sm"
            class="rounded-full"
          >
            {{ method }}
          </UBadge>
        </div>
      </div>

      <div class="api-detail__section">
        <span class="api-detail__label api-detail__section-label">
          <UIcon name="i-lucide-coins" class="size-3.5" />
          {{ $t('public.api.pricing.label') }}
        </span>
        <div class="api-detail__badges">
          <UBadge
            v-for="method in methods"
            :key="`cost-${method}`"
            :color="costFor(method) > 0 ? 'warning' : 'success'"
            variant="soft"
            size="sm"
            :icon="costFor(method) > 0 ? 'i-lucide-coins' : 'i-lucide-circle-check'"
            class="rounded-full"
          >
            {{ method }} · {{ costFor(method) > 0 ? costFor(method) : $t('public.api.pricing.free') }}
          </UBadge>
        </div>
      </div>

      <p
        v-if="description"
        class="api-detail__description"
      >
        {{ description }}
      </p>

      <UButton
        v-if="docUrl"
        :to="docUrl"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="outline"
        size="sm"
        trailing-icon="i-lucide-external-link"
        block
      >
        {{ $t('public.api.openDocumentation') }}
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.api-detail {
  background: var(--ui-bg-elevated);
}

.api-detail__badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.api-detail__body {
  display: grid;
  gap: 14px;
  padding: 1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
}

.api-detail__endpoint {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 14%, var(--ui-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--ui-primary) 4%, var(--ui-bg-muted));
}

.api-detail__endpoint span,
.api-detail__label,
.api-detail__cell span {
  color: var(--ui-text-muted);
  font-size: 11px;
  line-height: 1;
}

.api-detail__endpoint-label,
.api-detail__section-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.api-detail__endpoint a {
  min-width: 0;
  color: var(--ui-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
}

.api-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
}

.api-detail__cell {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  border: 0;
  border-radius: 0;
  background: color-mix(in srgb, var(--ui-bg-muted) 30%, transparent);
}

.api-detail__cell--calls {
  border-right: 1px solid var(--ui-border);
}

.api-detail__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ui-text-highlighted);
  background: color-mix(in srgb, var(--ui-bg-elevated) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-border) 74%, transparent);
}

.api-detail__cell--calls .api-detail__icon {
  color: var(--ui-info);
  background: color-mix(in srgb, var(--ui-info) 10%, var(--ui-bg-elevated));
}

.api-detail__cell--free .api-detail__icon {
  color: var(--ui-success);
  background: color-mix(in srgb, var(--ui-success) 10%, var(--ui-bg-elevated));
}

.api-detail__cell--key .api-detail__icon {
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.api-detail__cell-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.api-detail__cell-content strong {
  color: var(--ui-text);
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.api-detail__section {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.api-detail__section + .api-detail__section {
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--ui-border) 72%, transparent);
}

.api-detail__description {
  margin: 0;
  color: var(--ui-text-toned);
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}
</style>
