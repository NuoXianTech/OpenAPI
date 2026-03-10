<script lang="ts" setup>
import AppCard from '../AppCard.vue'

const props = defineProps({
  title: { type: String, default: '链接标题' },
  description: { type: String, default: '站点描述' },
  url: { type: String, default: '#' },
  status: { type: Number, default: -1 },
})
</script>

<template>
  <AppCard
    :title="props.title"
    :status="props.status"
  >
    <template #summary>
      <p class="text-[13px] text-gray-600">
        {{ props.description }}
      </p>
    </template>

    <template #details>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">
          网站
        </div>
        <a
          :href="props.url"
          target="_blank"
          class="text-[13px] underline break-all"
        >{{ props.url }}</a>
      </div>
    </template>
  </AppCard>
</template>
