<script lang="ts" setup>
import { computed } from 'vue'
import AppCard from '../AppCard.vue'

const props = defineProps({
  name: { type: String, default: '这是标题标题标题' },
  status: { type: Number, default: -1 },
  shortDesc: { type: String, default: '这是简短描述' },
  description: { type: String, default: '这是详细描述详细描述详细描述详细描述' },
  category: { type: String, default: '' },
  httpMethod: { type: String, default: 'GET' },
  apiPath: { type: String, default: '/api/v1/path' },
  docUrl: { type: String, default: 'https://example.com/docs' },
  isApiKey: { type: Boolean, default: false },
  totalCalls: { type: Number, default: 0 },
})

const methods = computed(() => props.httpMethod.split(',').map(method => method.trim()).filter(Boolean))
const categories = computed(() => props.category.split(',').map(item => item.trim()).filter(Boolean))

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
      <p class="my-2 min-h-[1.5em] shrink-0 line-clamp-3 overflow-hidden text-ellipsis text-sm leading-normal text-muted-foreground">
        {{ props.shortDesc }}
      </p>

      <div
        v-if="categories.length"
        class="flex flex-wrap gap-1.5 mb-2.5"
      >
        <Badge
          v-for="item in categories"
          :key="item"
          variant="secondary"
          class="rounded-full text-[11px] font-medium"
        >
          {{ item }}
        </Badge>
      </div>

      <div class="mt-2.5 mb-2.5 flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-border bg-muted/40 p-2">
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <span class="inline-flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-foreground/90">
            <Icon
              name="mdi:file-document-multiple-outline"
              size="16"
              :ssr="true"
            />
            {{ props.docUrl }}
          </span>
        </div>

        <Button
          as-child
          variant="outline"
          size="icon-sm"
          class="shrink-0"
        >
          <a
            :href="props.docUrl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="打开文档"
          >
            <Icon
              name="mdi:external-link"
              size="16"
              :ssr="true"
            />
          </a>
        </Button>
      </div>
    </template>

    <template #meta>
      <span
        v-if="props.isApiKey"
        class="flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Badge
          variant="outline"
          class="rounded-full"
        >
          <Icon
            name="mdi:key-variant"
            size="14"
          />
          APIkey
        </Badge>
      </span>
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
          <Badge
            v-for="method in methods"
            :key="method"
            variant="outline"
            class="rounded-full font-mono text-[11px]"
          >
            {{ method }}
          </Badge>
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          调用次数
        </div>
        <div class="flex flex-wrap gap-2 text-[12px] text-muted">
          <Badge
            variant="outline"
            class="rounded-full"
          >
            {{ formatCallCount(props.totalCalls) }}
          </Badge>
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
