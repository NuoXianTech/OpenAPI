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
    tag="div"
    class="link-grid"
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

<style scoped>
.link-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .link-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .link-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
