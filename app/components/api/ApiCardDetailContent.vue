<script setup lang="ts">
import { formatCompactCount } from '~/utils/number-format'
import { httpMethodColor } from '~/utils/http-method'

type ApiCardDetailBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type ApiCardDetailVariant = 'popover' | 'modal'

interface ApiCardDetailStatusMeta {
  label: string
  color: ApiCardDetailBadgeColor
  icon: string
}

interface ApiCardDetailContentProps {
  name: string
  shortDesc?: string
  description?: string
  apiPath: string
  docUrl?: string
  isApiKey: boolean
  methods: string[]
  methodCosts: Record<string, number>
  totalCalls: number
  statusMeta: ApiCardDetailStatusMeta
  variant?: ApiCardDetailVariant
}

const props = withDefaults(defineProps<ApiCardDetailContentProps>(), {
  shortDesc: '',
  description: '',
  docUrl: '',
  variant: 'popover'
})

const {
  name,
  shortDesc,
  description,
  apiPath,
  docUrl,
  isApiKey,
  methods,
  methodCosts,
  totalCalls,
  statusMeta,
  variant
} = toRefs(props)
const summary = computed(() => shortDesc.value || description.value || '暂无简介')

function costFor(method: string): number {
  const value = methodCosts.value[method.toUpperCase()]
  return typeof value === 'number' && value > 0 ? value : 0
}
</script>

<template>
  <div
    class="api-card-detail"
    :class="`api-card-detail--${variant}`"
  >
    <div
      v-if="variant === 'popover'"
      class="api-card-detail__head"
    >
      <div class="api-card-detail__badges">
        <UBadge
          :color="statusMeta.color"
          variant="soft"
          size="sm"
          :icon="statusMeta.icon"
          class="rounded-full"
        >
          {{ statusMeta.label }}
        </UBadge>
      </div>

      <h4 class="api-card-detail__title">
        {{ name }}
      </h4>
      <p class="api-card-detail__summary">
        {{ summary }}
      </p>
    </div>

    <div class="api-card-detail__body">
      <div class="api-card-detail__endpoint">
        <span>接口地址</span>
        <a
          :href="apiPath"
          target="_blank"
          rel="noopener noreferrer"
          :title="apiPath"
        >
          {{ apiPath }}
        </a>
      </div>

      <div class="api-card-detail__grid">
        <div
          class="api-card-detail__cell api-card-detail__cell--calls"
          :title="`调用次数 ${totalCalls.toLocaleString('zh-CN')}`"
        >
          <span
            class="api-card-detail__icon"
            aria-hidden="true"
          >
            <UIcon
              name="i-mdi-chart-bar"
              class="size-3.5"
            />
          </span>
          <div class="api-card-detail__cell-content">
            <span>调用次数</span>
            <strong>{{ formatCompactCount(totalCalls) }}</strong>
          </div>
        </div>

        <div
          class="api-card-detail__cell"
          :class="isApiKey ? 'api-card-detail__cell--key' : 'api-card-detail__cell--free'"
        >
          <span
            class="api-card-detail__icon"
            aria-hidden="true"
          >
            <UIcon
              :name="isApiKey ? 'i-mdi-key-variant' : 'i-mdi-gift-outline'"
              class="size-3.5"
            />
          </span>
          <div class="api-card-detail__cell-content">
            <span>鉴权要求</span>
            <strong>{{ isApiKey ? 'APIKey' : '无需 Key' }}</strong>
          </div>
        </div>
      </div>

      <div class="api-card-detail__section">
        <span class="api-card-detail__label">请求方法</span>
        <div class="api-card-detail__badges">
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

      <div class="api-card-detail__section">
        <span class="api-card-detail__label">调用计费</span>
        <div class="api-card-detail__badges">
          <UBadge
            v-for="method in methods"
            :key="`cost-${method}`"
            :color="costFor(method) > 0 ? 'warning' : 'success'"
            variant="soft"
            size="sm"
            :icon="costFor(method) > 0 ? 'i-mdi-cash-multiple' : 'i-mdi-gift-outline'"
            class="rounded-full"
          >
            {{ method }} · {{ costFor(method) > 0 ? `${costFor(method)} / 次` : '免费' }}
          </UBadge>
        </div>
      </div>

      <p
        v-if="description"
        class="api-card-detail__description"
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
        icon="i-mdi-open-in-new"
        block
      >
        打开接口文档
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.api-card-detail {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--ui-primary) 8%, transparent), transparent 48%),
    var(--ui-bg-elevated);
}

.api-card-detail--popover {
  width: min(360px, calc(100vw - 28px));
}

.api-card-detail--modal {
  width: 100%;
  background: var(--ui-bg-elevated);
}

.api-card-detail__head {
  display: grid;
  gap: 7px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--ui-border);
}

.api-card-detail__badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.api-card-detail__title {
  margin: 0;
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.api-card-detail__summary {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 12.5px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.api-card-detail__body {
  display: grid;
  gap: 10px;
  padding: 12px 14px 14px;
}

.api-card-detail--modal .api-card-detail__body {
  max-height: calc(86dvh - 86px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
}

.api-card-detail__endpoint {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg-muted) 48%, transparent);
}

.api-card-detail__endpoint span,
.api-card-detail__label,
.api-card-detail__cell span {
  color: var(--ui-text-muted);
  font-size: 11px;
  line-height: 1;
}

.api-card-detail__endpoint a {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-decoration: none;
}

.api-card-detail--modal .api-card-detail__endpoint a {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.api-card-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

.api-card-detail__cell {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg-muted) 42%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ui-text) 4%, transparent);
}

.api-card-detail__cell--calls {
  border-color: color-mix(in srgb, var(--ui-info) 22%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-info) 6%, var(--ui-bg-elevated));
}

.api-card-detail__cell--free {
  border-color: color-mix(in srgb, var(--ui-success) 22%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-success) 6%, var(--ui-bg-elevated));
}

.api-card-detail__cell--key {
  border-color: color-mix(in srgb, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 5%, var(--ui-bg-elevated));
}

.api-card-detail__icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ui-text-highlighted);
  background: color-mix(in srgb, var(--ui-bg-elevated) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-border) 74%, transparent);
}

.api-card-detail__cell--calls .api-card-detail__icon {
  color: var(--ui-info);
  background: color-mix(in srgb, var(--ui-info) 10%, var(--ui-bg-elevated));
}

.api-card-detail__cell--free .api-card-detail__icon {
  color: var(--ui-success);
  background: color-mix(in srgb, var(--ui-success) 10%, var(--ui-bg-elevated));
}

.api-card-detail__cell--key .api-card-detail__icon {
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.api-card-detail__cell-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.api-card-detail__cell-content strong {
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.api-card-detail__section {
  display: grid;
  gap: 7px;
}

.api-card-detail__description {
  max-height: 7.2em;
  overflow: auto;
  margin: 0;
  color: var(--ui-text-toned);
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.api-card-detail--modal .api-card-detail__description {
  max-height: none;
}
</style>
