<script lang="ts" setup>
import { computed, ref } from 'vue'

const props = defineProps({
  name: { type: String, default: '这是标题' },
  status: { type: Number, default: -1 },
  shortDesc: { type: String, default: '' },
  description: { type: String, default: '' },
  categoryName: { type: String, default: '' },
  httpMethod: { type: String, default: 'GET' },
  apiPath: { type: String, default: '/v1/path' },
  docUrl: { type: String, default: '' },
  isApiKey: { type: Boolean, default: false },
  costCredits: { type: Number, default: 0 },
  totalCalls: { type: Number, default: 0 },
})

const open = ref(false)

const methods = computed(() =>
  props.httpMethod.split(',').map(m => m.trim()).filter(Boolean),
)

const isPaid = computed(() => props.costCredits > 0)

const radarClass = computed(() => {
  switch (props.status) {
    case 1: return ''
    case 0: return 'is-error'
    default: return 'is-unknown'
  }
})

const radarTitle = computed(() => {
  switch (props.status) {
    case -1: return '未知'
    case 0: return '异常'
    case 1: return '正常'
    case 2: return '维护'
    case 3: return '废弃'
    default: return '未知'
  }
})

function formatCallCount(count: number) {
  if (count < 10000) return `${count}次`
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
        {{ props.name }}
      </h3>
      <span
        class="api-card__radar"
        :class="radarClass"
        :title="radarTitle"
      />
    </header>

    <p class="api-card__short">
      {{ props.shortDesc || '暂无简介' }}
    </p>

    <div
      v-if="props.categoryName"
      class="relative z-1 mb-2.5 flex flex-wrap gap-1.5 px-4"
    >
      <UBadge
        color="neutral"
        variant="soft"
        size="sm"
        class="rounded-full text-[11px]"
      >
        {{ props.categoryName }}
      </UBadge>
    </div>

    <div
      v-if="props.docUrl"
      class="api-card__doc"
    >
      <span
        class="api-card__doc-text"
        :title="props.docUrl"
      >
        <Icon
          name="i-lucide-file-text"
          size="13"
          :ssr="true"
        />
        {{ props.docUrl }}
      </span>
      <UButton
        :to="props.docUrl"
        target="_blank"
        rel="noopener"
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-lucide-external-link"
        square
        class="shrink-0"
        aria-label="打开文档"
      />
    </div>

    <div class="api-card__meta">
      <UBadge
        v-if="isPaid"
        color="warning"
        variant="soft"
        size="sm"
        icon="i-lucide-coins"
        class="rounded-full"
      >
        {{ props.costCredits }} / 次
      </UBadge>
      <UBadge
        v-else
        color="success"
        variant="soft"
        size="sm"
        icon="i-lucide-gift"
        class="rounded-full"
      >
        免费
      </UBadge>
      <UBadge
        v-if="props.isApiKey"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-key-round"
        class="rounded-full"
      >
        APIKey
      </UBadge>

      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-lucide-bar-chart-3"
        class="ml-auto rounded-full font-mono"
      >
        {{ formatCallCount(props.totalCalls) }}
      </UBadge>
    </div>

    <UCollapsible v-model:open="open">
      <div class="api-card__toggle-row">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="rounded-full"
          :aria-expanded="open"
        >
          {{ open ? '收起详情' : '查看详情' }}
        </UButton>
      </div>

      <template #content>
        <div class="api-card__details">
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">接口示例</span>
            <a
              :href="props.apiPath"
              target="_blank"
              rel="noopener"
              class="api-card__detail-value font-mono text-[12.5px]"
            >{{ props.apiPath }}</a>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">请求方法</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <UBadge
                v-for="method in methods"
                :key="method"
                color="neutral"
                variant="outline"
                size="sm"
                class="rounded-full font-mono text-[11px]"
              >
                {{ method }}
              </UBadge>
            </div>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">调用计费</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <UBadge
                v-if="isPaid"
                color="warning"
                variant="soft"
                size="sm"
                icon="i-lucide-coins"
                class="rounded-full"
              >
                {{ props.costCredits }} / 次
              </UBadge>
              <UBadge
                v-else
                color="success"
                variant="soft"
                size="sm"
                icon="i-lucide-gift"
                class="rounded-full"
              >
                免费
              </UBadge>
            </div>
          </div>
          <div class="api-card__detail-row">
            <span class="api-card__detail-label">调用次数</span>
            <div class="api-card__detail-value api-card__detail-value--row">
              <UBadge
                color="neutral"
                variant="outline"
                size="sm"
                class="rounded-full font-mono"
              >
                {{ formatCallCount(props.totalCalls) }}
              </UBadge>
            </div>
          </div>
          <div
            v-if="props.description"
            class="api-card__detail-row"
          >
            <span class="api-card__detail-label">接口描述</span>
            <p class="api-card__detail-value m-0 text-[12.5px] leading-relaxed">
              {{ props.description }}
            </p>
          </div>
        </div>
      </template>
    </UCollapsible>
  </UCard>
</template>
