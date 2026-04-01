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
        class="my-2 mb-3 min-h-[1.5em] shrink-0 line-clamp-3 overflow-hidden text-ellipsis text-sm leading-[1.5] text-muted-foreground"
        :title="displayDescription"
      >
        {{ displayDescription }}
      </p>

      <div class="mb-2.5 flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-border bg-muted/40 p-2">
        <div class="flex items-baseline gap-2 min-w-0 flex-1">
          <span
            class="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-foreground/90"
            :title="props.url"
          >
            {{ props.url }}
          </span>
        </div>

        <UiButton
          as-child
          variant="outline"
          size="icon-sm"
          class="shrink-0"
        >
          <a
            :href="props.url"
            target="_blank"
            rel="noopener noreferrer"
            title="打开链接"
          >
            <Icon
              name="mdi:external-link"
              size="16"
              :ssr="true"
            />
          </a>
        </UiButton>
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
