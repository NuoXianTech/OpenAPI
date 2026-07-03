<script lang="ts" setup>
import type { ApiCatalogItem, ApiCategoryItem } from '~/types/api'

const { items, categoryMap } = defineProps({
  items: { type: Array as PropType<ApiCatalogItem[]>, default: () => [] },
  categoryMap: { type: Object as PropType<Record<number, ApiCategoryItem>>, default: () => ({}) }
})

function resolveCategoryName(id: number | null | undefined) {
  if (typeof id !== 'number') {
    return '未分类'
  }
  return categoryMap[id]?.name || '未分类'
}
</script>

<template>
  <div>
    <TransitionGroup
      name="api-card"
      tag="div"
      class="api-card-grid"
      appear
    >
      <ApiCard
        v-for="(item, index) in items"
        :key="item.id ?? index"
        :name="item.name"
        :status="item.status"
        :short-desc="item.shortDesc"
        :description="item.description"
        :category-name="resolveCategoryName(item.categoryId)"
        :http-method="item.httpMethod"
        :api-path="item.apiPath"
        :doc-url="item.docUrl"
        :is-api-key="item.isApiKey"
        :method-costs="item.methodCosts"
        :total-calls="item.totalCalls"
        class="api-card-item"
        :style="{ animationDelay: `${Math.min(index, 12) * 40}ms` }"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.api-card-grid {
  contain: content;
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .api-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .api-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.api-card-item {
  will-change: transform, opacity;
}

.api-card-enter-active,
.api-card-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.api-card-enter-from,
.api-card-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}

.api-card-move {
  transition: transform 180ms ease;
}
</style>
