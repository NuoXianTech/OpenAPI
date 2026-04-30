<script lang="ts" setup>
import { computed } from 'vue'
import AppCard from '../AppCard.vue'

const props = defineProps({
  name: { type: String, default: '这是标题标题标题' },
  status: { type: Number, default: -1 },
  shortDesc: { type: String, default: '这是简短描述' },
  description: { type: String, default: '这是详细描述详细描述详细描述详细描述' },
  categoryName: { type: String, default: '' },
  httpMethod: { type: String, default: 'GET' },
  apiPath: { type: String, default: '/v1/path' },
  docUrl: { type: String, default: 'https://example.com/docs' },
  isApiKey: { type: Boolean, default: false },
  costCredits: { type: Number, default: 0 },
  totalCalls: { type: Number, default: 0 },
})

const methods = computed(() => props.httpMethod.split(',').map(method => method.trim()).filter(Boolean))

const isPaid = computed(() => props.costCredits > 0)

function formatCallCount(count: number) {
  if (count < 10000) {
    return `${count}次`
  }
  return `${Math.floor(count / 10000)}万`
}
</script>

<template>
  <AppCard
    :title="props.name"
    :status="props.status"
  >
    <template #header>
      {{ props.name }}
    </template>

    <template #summary>
      <p class="my-2 min-h-[1.5em] shrink-0 line-clamp-3 overflow-hidden text-ellipsis text-sm leading-normal text-muted">
        {{ props.shortDesc }}
      </p>

      <div
        v-if="props.categoryName"
        class="flex flex-wrap gap-1.5 mb-2.5"
      >
        <UBadge
          color="neutral"
          variant="soft"
          class="rounded-full text-[11px] font-medium"
        >
          {{ props.categoryName }}
        </UBadge>
      </div>

      <div class="mt-2.5 mb-2.5 flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-default bg-muted/40 p-2">
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <span class="inline-flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-default/90">
            <Icon
              name="mdi:file-document-multiple-outline"
              size="16"
              :ssr="true"
            />
            {{ props.docUrl }}
          </span>
        </div>

        <UButton
          :to="props.docUrl"
          target="_blank"
          variant="outline"
          size="xs"
          class="shrink-0"
          aria-label="打开文档"
        >
          <Icon
            name="mdi:external-link"
            size="16"
            :ssr="true"
          />
        </UButton>
      </div>
    </template>

    <template #meta>
      <div class="flex items-center gap-1.5">
        <UBadge
          v-if="isPaid"
          color="warning"
          variant="soft"
          class="rounded-full"
        >
          <Icon
            name="mdi:cash-multiple"
            size="14"
            class="mr-0.5"
          />
          收费 {{ props.costCredits }}/次
        </UBadge>
        <UBadge
          v-else
          color="success"
          variant="soft"
          class="rounded-full"
        >
          <Icon
            name="mdi:gift-outline"
            size="14"
            class="mr-0.5"
          />
          免费
        </UBadge>
        <UBadge
          v-if="props.isApiKey"
          variant="outline"
          class="rounded-full"
        >
          <Icon
            name="mdi:key-variant"
            size="14"
          />
          APIkey
        </UBadge>
      </div>
    </template>

    <template #details>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          接口示例
        </div>
        <a
          :href="`${props.apiPath}`"
          target="_blank"
          class="text-[13px] underline font-mono break-all"
        >{{ props.apiPath }}</a>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          请求方法
        </div>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="method in methods"
            :key="method"
            variant="outline"
            class="rounded-full font-mono text-[11px]"
          >
            {{ method }}
          </UBadge>
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          调用计费
        </div>
        <div class="flex items-center flex-wrap gap-2 text-[13px]">
          <template v-if="isPaid">
            <UBadge
              color="warning"
              variant="soft"
              class="rounded-full"
            >
              <Icon
                name="mdi:cash-multiple"
                size="14"
                class="mr-0.5"
              />
              {{ props.costCredits }} / 次
            </UBadge>
            <span class="text-muted text-xs">
              成功调用扣费，失败不扣；调用前需准备 API Key 与余额
            </span>
          </template>
          <template v-else>
            <UBadge
              color="success"
              variant="soft"
              class="rounded-full"
            >
              <Icon
                name="mdi:gift-outline"
                size="14"
                class="mr-0.5"
              />
              免费
            </UBadge>
            <span class="text-muted text-xs">
              当前接口不消耗余额
            </span>
          </template>
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          调用次数
        </div>
        <div class="flex flex-wrap gap-2 text-[12px] text-muted">
          <UBadge
            variant="outline"
            class="rounded-full"
          >
            {{ formatCallCount(props.totalCalls) }}
          </UBadge>
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          接口描述
        </div>
        <div class="text-[13px] break-all">
          {{ props.description }}
        </div>
      </div>
    </template>
  </AppCard>
</template>
