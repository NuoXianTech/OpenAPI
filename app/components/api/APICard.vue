<script lang="ts" setup>
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const {
  name = '这是标题',
  status = -1,
  shortDesc = '',
  description = '',
  categoryName = '',
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

const open = ref(false)

const methods = computed(() =>
  httpMethod.split(',').map(m => m.trim()).filter(Boolean)
)

function costFor(method: string): number {
  const v = methodCosts?.[method.toUpperCase()]
  return typeof v === 'number' && v > 0 ? v : 0
}

const isPaid = computed(() => methods.value.some(m => costFor(m) > 0))
const isAllPaid = computed(() => methods.value.length > 0 && methods.value.every(m => costFor(m) > 0))
// 当全部方法同价时给一个聚合金额用于顶部 badge；否则用 -1 表示"按方法定价"
const aggregateCost = computed(() => {
  if (methods.value.length === 0) return 0
  const prices = methods.value.map(costFor)
  const first = prices[0]!
  return prices.every(p => p === first) ? first : -1
})

function methodColor(method: string): BadgeColor {
  switch (method.trim().toUpperCase()) {
    case 'GET': return 'success'
    case 'POST': return 'info'
    case 'PUT': return 'warning'
    case 'DELETE': return 'error'
    case 'PATCH': return 'secondary'
    default: return 'neutral'
  }
}

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

function formatCallCount(count: number) {
  if (count < 10000) return `${count}`
  return `${Math.floor(count / 10000)}万`
}
</script>

<template>
  <UCard
    variant="outline"
    class="api-card border-default bg-elevated"
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

    <div
      v-if="categoryName"
      class="relative z-1 mb-2.5 flex flex-wrap gap-1.5 px-4"
    >
      <UBadge
        color="neutral"
        variant="soft"
        size="sm"
        class="rounded-full text-[11px]"
      >
        {{ categoryName }}
      </UBadge>
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

    <UCollapsible v-model:open="open">
      <div class="api-card__toggle-row">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :trailing-icon="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
          class="rounded-full"
          :aria-expanded="open"
        >
          {{ open ? '收起详情' : '查看详情' }}
        </UButton>
      </div>

      <template #content>
        <div class="api-card__details">
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">接口地址</span>
            <a
              :href="apiPath"
              target="_blank"
              rel="noopener"
              class="api-card__detail-value font-mono text-[12.5px]"
            >{{ apiPath }}</a>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">请求方法</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <UBadge
                v-for="method in methods"
                :key="method"
                :color="methodColor(method)"
                variant="soft"
                size="sm"
                class="rounded-full"
              >
                {{ method }}
              </UBadge>
            </div>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">调用计费</span>
            <div class="api-card__detail-value api-card__detail-value--row">
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
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">鉴权要求</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <UBadge
                v-if="isApiKey"
                color="neutral"
                variant="subtle"
                size="sm"
                icon="i-mdi-key-variant"
                class="rounded-full"
              >
                需要 APIKey
              </UBadge>
              <UBadge
                v-else
                color="neutral"
                variant="subtle"
                size="sm"
                icon="i-mdi-lock-open-outline"
                class="rounded-full"
              >
                无需 APIKey
              </UBadge>
            </div>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">调用次数</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <span class="api-card__calls">
                <UIcon
                  name="i-mdi-chart-bar"
                  class="size-3"
                />
                <span class="api-card__calls-num">{{ formatCallCount(totalCalls) }}</span>
                <span class="api-card__calls-label">次</span>
              </span>
            </div>
          </div>
          <div
            v-if="description"
            class="api-card__detail-row"
          >
            <span class="api-card__detail-label">接口描述</span>
            <p class="api-card__detail-value m-0 text-[12.5px] leading-relaxed">
              {{ description }}
            </p>
          </div>
        </div>
      </template>
    </UCollapsible>
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

.api-card__details {
  border-top: 1px dashed var(--ui-border);
  padding: 12px 16px 14px;
  background: color-mix(in srgb, var(--ui-bg-muted) 30%, transparent);
  display: grid;
  gap: 8px;
}

.api-card__detail-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
  align-items: start;
  font-size: 12.5px;
}

.api-card__detail-label {
  color: var(--ui-text-muted);
  font-size: 11px;
  letter-spacing: 0.04em;
  padding-top: 2px;
}

.api-card__detail-value {
  color: var(--ui-text);
  word-break: break-all;
}

.api-card__detail-value a {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.api-card__detail-value--row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.api-card__toggle-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px 12px;
}

.api-card__radar {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
  background: var(--green);
  box-shadow: 0 0 0 2px rgba(35, 197, 94, 0.24), 0 0 8px rgba(35, 197, 94, 0.45);
  flex-shrink: 0;
}

.api-card__radar::before,
.api-card__radar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(35, 197, 94, 0.3);
  animation: radarPulse 2s ease-out infinite;
}

.api-card__radar::after {
  animation-delay: 1s;
}

.api-card__radar.is-error {
  background: var(--red);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.24), 0 0 8px rgba(239, 68, 68, 0.45);
}

.api-card__radar.is-error::before,
.api-card__radar.is-error::after {
  border-color: rgba(239, 68, 68, 0.32);
}

.api-card__radar.is-unknown {
  background: var(--gray);
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.24), 0 0 8px rgba(148, 163, 184, 0.45);
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

@keyframes radarPulse {
  0% { transform: scale(1); opacity: 0.6; }
  70% { transform: scale(2.3); opacity: 0; }
  100% { transform: scale(2.5); opacity: 0; }
}
</style>
