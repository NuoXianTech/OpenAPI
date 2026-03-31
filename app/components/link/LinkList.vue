<script lang="ts" setup>
import type { PropType } from 'vue'
import type { FriendLinkItem } from '~/composables/link/types'

const { items } = defineProps({
  items: { type: Array as PropType<FriendLinkItem[]>, default: () => [] },
})
</script>

<template>
  <TransitionGroup
    name="api-card"
    tag="main"
    class="grid grid-cols-12 gap-4 items-start api-card-grid"
    appear
  >
    <LinkCard
      v-for="(item, index) in items"
      :key="item.id ?? index"
      :title="item.title"
      :description="item.description || '暂无描述'"
      :url="item.url"
      :status="item.isActive ? 1 : 0"
      class="api-card-item"
      :style="{ animationDelay: `${Math.min(index, 12) * 40}ms` }"
    />
  </TransitionGroup>
</template>
