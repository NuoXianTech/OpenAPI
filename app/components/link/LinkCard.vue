<script lang="ts" setup>
import { computed } from 'vue'
import AppCard from '../AppCard.vue'

const props = defineProps({
  title: { type: String, default: '链接标题' },
  description: { type: String, default: '站点描述' },
  url: { type: String, default: '#' },
  status: { type: Number, default: -1 },
})

const displayDescription = computed(() => {
  const value = props.description.trim()
  return value || '暂无描述'
})
</script>

<template>
  <AppCard
    :title="props.title"
    :status="props.status"
  >
    <template #summary>
      <p
        class="text-muted text-sm my-2 mb-3 line-clamp-3 overflow-hidden text-ellipsis min-h-[1.5em] leading-[1.5] shrink-0"
        :title="displayDescription"
      >
        {{ displayDescription }}
      </p>

      <div class="flex items-center justify-between gap-2.5 bg-bg border border-border rounded-[10px] p-2 mb-2.5 shrink-0">
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <span
            class="text-xs font-mono text-text overflow-hidden text-ellipsis whitespace-nowrap"
            :title="props.url"
          >
            {{ props.url }}
          </span>
        </div>

        <a
          :href="props.url"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-surface border border-border text-text rounded-lg p-1.5 cursor-pointer leading-none shrink-0 hover:brightness-95 transition-colors flex items-center justify-center"
          title="打开链接"
        >
          <Icon
            name="mdi:external-link"
            size="16"
            :ssr="true"
          />
        </a>
      </div>
    </template>

    <template #details>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          站点描述
        </div>
        <div class="text-[13px] break-all">
          {{ displayDescription }}
        </div>
      </div>
    </template>
  </AppCard>
</template>
