<script lang="ts" setup>
import AppCard from '../AppCard.vue'

const props = defineProps({
  name: { type: String, default: '这是标题标题标题' },
  status: { type: Number, default: -1 },
  shortDesc: { type: String, default: '这是简短描述' },
  description: { type: String, default: '这是详细描述详细描述详细描述详细描述' },
  httpMethod: { type: String, default: 'GET' },
  apiPath: { type: String, default: '/api/v1/path' },
  docUrl: { type: String, default: 'https://example.com/docs' },
  isApiKey: { type: Boolean, default: false },
})
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
      <p class="text-gray-600 text-sm my-2 line-clamp-3 overflow-hidden text-ellipsis min-h-[1.5em] leading-normal shrink-0">
        {{ props.shortDesc }}
      </p>

      <div class="flex items-center justify-between gap-2.5 bg-grey border border-border rounded-[10px] p-2 mt-2.5 mb-2.5 shrink-0">
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <span class="inline-flex items-center gap-1.5 text-xs font-mono text-text overflow-hidden text-ellipsis whitespace-nowrap">
            <Icon
              name="mdi:file-document-multiple-outline"
              size="16"
              :ssr="true"
            />
            {{ props.docUrl }}
          </span>
        </div>
        <a
          :href="props.docUrl"
          target="_blank"
          class="bg-surface border border-border text-text rounded-lg p-1.5 cursor-pointer leading-none shrink-0 hover:brightness-95 flex items-center justify-center"
        >
          <Icon
            name="mdi:external-link"
            size="16"
            :ssr="true"
          />
        </a>
      </div>
    </template>

    <template #meta>
      <span
        v-if="props.isApiKey"
        class="text-xs text-gray-500 flex items-center gap-1"
      >
        <Icon
          name="mdi:key-variant"
          size="14"
        />
        APIkey
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
        <div class="text-[13px] font-mono break-all">
          {{ props.httpMethod }}
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          调用次数
        </div>
        <div class="text-[13px] font-mono break-all">
          100万
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
