<script lang="ts" setup>
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const {
  name = '这是标题',
  status = -1,
  shortDesc = '',
  description = '',
  categoryName = '未分类',
  httpMethod = 'GET',
  apiPath = '/v1/path',
  docUrl = '',
  isApiKey = false,
  methodCosts = {},
  totalCalls = 0
} = defineProps<{
  name?: string
  status?: number
  shortDesc?: string
  description?: string
  categoryName?: string
  httpMethod?: string
  apiPath?: string
  docUrl?: string
  isApiKey?: boolean
  methodCosts?: Record<string, number>
  totalCalls?: number
}>()

const detailsOpen = ref(false)

const methods = computed(() =>
  httpMethod.split(',').map(m => m.trim()).filter(Boolean)
)

const categoryLabel = computed(() => categoryName.trim() || '未分类')
const isUncategorized = computed(() => categoryLabel.value === '未分类')

function costFor(method: string): number {
  const v = methodCosts?.[method.toUpperCase()]
  return typeof v === 'number' && v > 0 ? v : 0
}

const isAllPaid = computed(() => methods.value.length > 0 && methods.value.every(m => costFor(m) > 0))
// 当全部方法同价时给一个聚合金额用于顶部 badge；否则用 -1 表示"按方法定价"
const aggregateCost = computed(() => {
  if (methods.value.length === 0) return 0
  const prices = methods.value.map(costFor)
  const first = prices[0]!
  return prices.every(p => p === first) ? first : -1
})

const radarClass = computed(() => {
  switch (status) {
    case 1: return ''
    case 0: return 'is-error'
    default: return 'is-unknown'
  }
})

const radarTitle = computed(() => {
  switch (status) {
    case -1: return '未知'
    case 0: return '异常'
    case 1: return '正常'
    case 2: return '维护'
    case 3: return '废弃'
    default: return '未知'
  }
})

const statusMeta = computed(() => {
  switch (status) {
    case 1:
      return { label: '正常', color: 'success' as BadgeColor, icon: 'i-mdi-check-circle-outline' }
    case 0:
      return { label: '异常', color: 'error' as BadgeColor, icon: 'i-mdi-alert-circle-outline' }
    case 2:
      return { label: '维护', color: 'warning' as BadgeColor, icon: 'i-mdi-wrench-outline' }
    case 3:
      return { label: '废弃', color: 'neutral' as BadgeColor, icon: 'i-mdi-archive-outline' }
    default:
      return { label: '未知', color: 'neutral' as BadgeColor, icon: 'i-mdi-help-circle-outline' }
  }
})

function formatCallCount(count: number) {
  if (count < 10000) return `${count}`
  return `${Math.floor(count / 10000)}万`
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

    <div class="api-card__category-row">
      <span
        class="api-card__category-chip"
        :class="{ 'is-uncategorized': isUncategorized }"
      >
        <UIcon
          name="i-mdi-tag-outline"
          class="size-3.5"
        />
        <span>{{ categoryLabel }}</span>
      </span>
    </div>

    <div
      v-if="docUrl"
      class="api-card__doc"
    >
      <span
        class="api-card__doc-text"
        :title="docUrl"
      >
        <UIcon
          name="i-mdi-file-document-outline"
          class="size-3.5"
        />
        {{ docUrl }}
      </span>
      <UButton
        :to="docUrl"
        target="_blank"
        rel="noopener"
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-mdi-open-in-new"
        square
        class="shrink-0"
        aria-label="打开文档"
      />
    </div>

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
        color="success"
        variant="soft"
        size="sm"
        icon="i-mdi-gift-outline"
        class="api-card__badge-icon rounded-full"
        title="免费"
        aria-label="免费"
      />
      <UBadge
        v-if="isApiKey"
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-mdi-key-variant"
        class="api-card__badge-icon rounded-full"
        title="需要 APIKey"
        aria-label="需要 APIKey"
      />

      <span class="api-card__calls">
        <UIcon
          name="i-mdi-chart-bar"
          class="size-3"
        />
        <span class="api-card__calls-num">{{ formatCallCount(totalCalls) }}</span>
      </span>
    </div>

    <div class="api-card__toggle-row">
      <UPopover
        v-model:open="detailsOpen"
        arrow
        :content="{ align: 'end', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
        :ui="{ content: 'p-0 overflow-hidden' }"
      >
        <UButton
          color="neutral"
          :variant="detailsOpen ? 'soft' : 'ghost'"
          size="xs"
          :trailing-icon="detailsOpen ? 'i-mdi-chevron-up' : 'i-mdi-arrow-right'"
          class="rounded-full"
        >
          {{ detailsOpen ? '收起详情' : '查看详情' }}
        </UButton>

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
                <span
                  class="api-card__category-chip api-card__category-chip--compact"
                  :class="{ 'is-uncategorized': isUncategorized }"
                >
                  <UIcon
                    name="i-mdi-tag-outline"
                    class="size-3.5"
                  />
                  <span>{{ categoryLabel }}</span>
                </span>
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
                <div class="api-card__detail-cell">
                  <span>调用次数</span>
                  <strong>{{ formatCallCount(totalCalls) }}</strong>
                </div>
                <div class="api-card__detail-cell">
                  <span>鉴权要求</span>
                  <strong>{{ isApiKey ? 'APIKey' : '无需' }}</strong>
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

.api-card__category-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0 16px 10px;
}

.api-card__category-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  height: 24px;
  padding: 0 9px 0 7px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 18%, var(--ui-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
  color: var(--ui-text-toned);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
}

.api-card__category-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card__category-chip.is-uncategorized {
  border-color: var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 68%, transparent);
  color: var(--ui-text-muted);
}

.api-card__doc {
  position: relative;
  z-index: 1;
  margin: 0 16px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 50%, transparent);
  border-radius: 10px;
  padding: 6px 8px 6px 10px;
}

.api-card__doc-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--ui-text-toned);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
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

.api-card__radar {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
  background: var(--ui-color-success-500);
  box-shadow: 0 0 0 2px rgba(35, 197, 94, 0.24), 0 0 8px rgba(35, 197, 94, 0.45);
  flex-shrink: 0;
}

.api-card__radar::before,
.api-card__radar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(35, 197, 94, 0.4);
  animation: radarPulse 2s ease-out infinite;
}

.api-card__radar::after {
  animation-delay: 0s;
}

.api-card__radar.is-error {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.24), 0 0 8px rgba(239, 68, 68, 0.45);
}

.api-card__radar.is-error::before,
.api-card__radar.is-error::after {
  border-color: rgba(239, 68, 68, 0.32);
}

.api-card__radar.is-unknown {
  background: #94a3b8;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.24), 0 0 8px rgba(148, 163, 184, 0.45);
}

.api-card__radar.is-unknown::before,
.api-card__radar.is-unknown::after {
  border-color: rgba(148, 163, 184, 0.32);
}

.api-card__calls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 60%, transparent);
  color: var(--ui-text-muted);
  font-size: 11px;
  line-height: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: nowrap;
}

.api-card__calls-num {
  font-weight: 600;
  color: var(--ui-text);
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

.api-card__category-chip--compact {
  height: 22px;
  font-size: 11px;
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
  display: grid;
  gap: 4px;
  padding: 9px 10px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg-muted) 34%, transparent);
}

.api-card__detail-cell strong {
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
