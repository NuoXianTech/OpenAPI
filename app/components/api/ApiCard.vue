<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'

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
  name: '这是标题',
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
const {
  name,
  shortDesc,
  description,
  apiPath,
  docUrl,
  isApiKey,
  totalCalls
} = toRefs(props)
const detailsOpen = ref(false)
const methods = computed(() => parseMethods(props.httpMethod))
const isAllPaid = computed(() => methods.value.length > 0 && methods.value.every(method => costFor(method) > 0))
const aggregateCost = computed(() => {
  if (methods.value.length === 0) return 0
  const prices = methods.value.map(costFor)
  const first = prices[0]!
  return prices.every(price => price === first) ? first : -1
})
const compactCallCountFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
})
const radarMeta = computed(() => getSuccessRadar(props.status))
const radarClass = computed(() => radarMeta.value.className)
const radarTitle = computed(() => radarMeta.value.title)
const statusMeta = computed(() => getStatusMeta(props.status))

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
      return { className: '', title: '正常' }
    case API_STATUS.abnormal:
      return { className: 'is-error', title: '异常' }
    default:
      return { className: 'is-unknown', title: '未知' }
  }
}

function getStatusMeta(status = -1): ApiCardStatusMeta {
  switch (status) {
    case API_STATUS.normal:
      return { label: '正常', color: 'success', icon: 'i-mdi-check-circle-outline' }
    case API_STATUS.abnormal:
      return { label: '异常', color: 'error', icon: 'i-mdi-alert-circle-outline' }
    case API_STATUS.maintenance:
      return { label: '维护', color: 'warning', icon: 'i-mdi-wrench-outline' }
    case API_STATUS.deprecated:
      return { label: '废弃', color: 'neutral', icon: 'i-mdi-archive-outline' }
    case API_STATUS.automatic:
      return { label: '自动', color: 'info', icon: 'i-mdi-sync' }
    default:
      return { label: '未知', color: 'neutral', icon: 'i-mdi-help-circle-outline' }
  }
}

function formatCallCount(count: number): string {
  const normalizedCount = Math.max(0, Math.floor(count))
  if (normalizedCount < 10000) return normalizedCount.toLocaleString('zh-CN')
  return compactCallCountFormatter.format(normalizedCount)
}
</script>

<template>
  <UCard
    variant="outline"
    class="api-card border-default bg-elevated"
    :class="{ 'is-active': detailsOpen }"
    :ui="{ root: 'gap-0', body: '!p-0' }"
  >
    <header class="api-card__head">
      <h3 class="api-card__title">
        {{ name }}
      </h3>
      <span
        class="api-card__radar"
        :class="radarClass"
        :title="radarTitle"
      />
    </header>

    <p class="api-card__short">
      {{ shortDesc || '暂无简介' }}
    </p>

    <div class="api-card__meta">
      <UBadge
        v-if="aggregateCost > 0"
        color="warning"
        variant="soft"
        size="sm"
        icon="i-mdi-cash-multiple"
        class="rounded-full"
        :title="`收费 ${aggregateCost} / 次`"
      >
        {{ aggregateCost }}
      </UBadge>
      <UBadge
        v-else-if="aggregateCost === -1"
        color="warning"
        variant="soft"
        size="sm"
        icon="i-mdi-cash-multiple"
        class="rounded-full"
        :title="isAllPaid ? '按方法定价' : '部分方法收费'"
      >
        {{ isAllPaid ? '按方法定价' : '部分收费' }}
      </UBadge>
      <UBadge
        v-else
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-mdi-gift-outline"
        class="api-card__badge-icon api-card__badge-icon--free rounded-full"
        title="免费"
        aria-label="免费"
      />
      <UBadge
        v-if="isApiKey"
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-mdi-key-variant"
        class="api-card__badge-icon api-card__badge-icon--key rounded-full"
        title="需要 APIKey"
        aria-label="需要 APIKey"
      />

      <span
        class="api-card__calls"
        :title="`调用次数 ${totalCalls.toLocaleString('zh-CN')}`"
      >
        <span
          class="api-card__calls-icon"
          aria-hidden="true"
        >
          <UIcon
            name="i-mdi-chart-bar"
            class="size-3"
          />
        </span>
        <span class="api-card__calls-num">{{ formatCallCount(totalCalls) }}</span>
      </span>
    </div>

    <div class="api-card__toggle-row">
      <div class="api-card__actions">
        <UTooltip
          v-if="docUrl"
          text="打开接口文档"
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
            文档
          </UButton>
        </UTooltip>

        <UPopover
          v-model:open="detailsOpen"
          arrow
          :content="{ align: 'end', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
          :ui="{ content: 'p-0 overflow-hidden' }"
        >
          <UTooltip
            :text="detailsOpen ? '收起接口详情' : '查看接口详情'"
            :content="{ side: 'top' }"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              :icon="detailsOpen ? 'i-mdi-chevron-up' : 'i-mdi-information-outline'"
              class="api-card__action-button"
            >
              {{ detailsOpen ? '收起' : '详情' }}
            </UButton>
          </UTooltip>

          <template #content>
            <div class="api-card__popover">
              <div class="api-card__popover-head">
                <div class="api-card__popover-badges">
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

                <h4 class="api-card__popover-title">
                  {{ name }}
                </h4>
                <p class="api-card__popover-summary">
                  {{ shortDesc || description || '暂无简介' }}
                </p>
              </div>

              <div class="api-card__popover-body">
                <div class="api-card__endpoint">
                  <span>接口地址</span>
                  <a
                    :href="apiPath"
                    target="_blank"
                    rel="noopener"
                    :title="apiPath"
                  >
                    {{ apiPath }}
                  </a>
                </div>

                <div class="api-card__detail-grid">
                  <div
                    class="api-card__detail-cell api-card__detail-cell--calls"
                    :title="`调用次数 ${totalCalls.toLocaleString('zh-CN')}`"
                  >
                    <span
                      class="api-card__detail-icon"
                      aria-hidden="true"
                    >
                      <UIcon
                        name="i-mdi-chart-bar"
                        class="size-3.5"
                      />
                    </span>
                    <div class="api-card__detail-content">
                      <span>调用次数</span>
                      <strong>{{ formatCallCount(totalCalls) }}</strong>
                    </div>
                  </div>
                  <div
                    class="api-card__detail-cell"
                    :class="isApiKey ? 'api-card__detail-cell--key' : 'api-card__detail-cell--free'"
                  >
                    <span
                      class="api-card__detail-icon"
                      aria-hidden="true"
                    >
                      <UIcon
                        :name="isApiKey ? 'i-mdi-key-variant' : 'i-mdi-gift-outline'"
                        class="size-3.5"
                      />
                    </span>
                    <div class="api-card__detail-content">
                      <span>鉴权要求</span>
                      <strong>{{ isApiKey ? 'APIKey' : '无需 Key' }}</strong>
                    </div>
                  </div>
                </div>

                <div class="api-card__popover-section">
                  <span class="api-card__popover-label">请求方法</span>
                  <div class="api-card__popover-badges">
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

                <div class="api-card__popover-section">
                  <span class="api-card__popover-label">调用计费</span>
                  <div class="api-card__popover-badges">
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
                  class="api-card__popover-description"
                >
                  {{ description }}
                </p>

                <UButton
                  v-if="docUrl"
                  :to="docUrl"
                  target="_blank"
                  rel="noopener"
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
        </UPopover>
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
  background: radial-gradient(circle at top right, color-mix(in srgb, var(--ui-text) 5%, transparent), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.api-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -10px rgba(17, 17, 19, 0.16);
}

.api-card.is-active {
  border-color: color-mix(in srgb, var(--ui-primary) 42%, var(--ui-border));
  box-shadow: 0 14px 30px -22px color-mix(in srgb, var(--ui-primary) 44%, transparent);
}

:global(.dark) .api-card:hover {
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.5);
}

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

.api-card__meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 16px 12px;
}

.api-card__toggle-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  padding: 0 16px 12px;
}

.api-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

.api-card__meta .api-card__calls {
  margin-left: auto;
}

.api-card__badge-icon {
  width: 22px;
  height: 22px;
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  background: color-mix(in srgb, var(--ui-bg-muted) 62%, transparent) !important;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--ui-text) 5%, transparent);
}

.api-card__badge-icon--free {
  color: var(--ui-success);
  border-color: color-mix(in srgb, var(--ui-success) 26%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-success) 8%, var(--ui-bg-elevated)) !important;
}

.api-card__badge-icon--key {
  color: var(--ui-primary);
  border-color: color-mix(in srgb, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 6%, var(--ui-bg-elevated)) !important;
}

.api-card__badge-icon > span {
  margin: 0;
}

.api-card__popover {
  width: min(360px, calc(100vw - 28px));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--ui-primary) 8%, transparent), transparent 48%),
    var(--ui-bg-elevated);
}

.api-card__popover-head {
  display: grid;
  gap: 7px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--ui-border);
}

.api-card__popover-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.api-card__popover-title {
  margin: 0;
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.api-card__popover-summary {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 12.5px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.api-card__popover-body {
  display: grid;
  gap: 10px;
  padding: 12px 14px 14px;
}

.api-card__endpoint {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg-muted) 48%, transparent);
}

.api-card__endpoint span,
.api-card__popover-label,
.api-card__detail-cell span {
  color: var(--ui-text-muted);
  font-size: 11px;
  line-height: 1;
}

.api-card__endpoint a {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-decoration: none;
}

.api-card__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.api-card__detail-cell {
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

.api-card__detail-cell--calls {
  border-color: color-mix(in srgb, var(--ui-info) 22%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-info) 6%, var(--ui-bg-elevated));
}

.api-card__detail-cell--free {
  border-color: color-mix(in srgb, var(--ui-success) 22%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-success) 6%, var(--ui-bg-elevated));
}

.api-card__detail-cell--key {
  border-color: color-mix(in srgb, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-primary) 5%, var(--ui-bg-elevated));
}

.api-card__detail-icon {
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

.api-card__detail-cell--calls .api-card__detail-icon {
  color: var(--ui-info);
  background: color-mix(in srgb, var(--ui-info) 10%, var(--ui-bg-elevated));
}

.api-card__detail-cell--free .api-card__detail-icon {
  color: var(--ui-success);
  background: color-mix(in srgb, var(--ui-success) 10%, var(--ui-bg-elevated));
}

.api-card__detail-cell--key .api-card__detail-icon {
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.api-card__detail-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.api-card__detail-content strong {
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.api-card__popover-section {
  display: grid;
  gap: 7px;
}

.api-card__popover-description {
  max-height: 7.2em;
  overflow: auto;
  margin: 0;
  color: var(--ui-text-toned);
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}

@keyframes radarPulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
</style>
