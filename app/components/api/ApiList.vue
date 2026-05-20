<script lang="ts" setup>
import type { ApiCatalogItem, ApiCategoryItem } from '~/composables/api/types'

const { items, categoryMap } = defineProps({
  items: { type: Array as PropType<ApiCatalogItem[]>, default: () => [] },
  categoryMap: { type: Object as PropType<Record<number, ApiCategoryItem>>, default: () => ({}) }
})

function resolveCategoryName(id: number | null | undefined) {
  if (typeof id !== 'number') {
    return ''
  }
  return categoryMap[id]?.name || ''
}
</script>

<template>
  <TransitionGroup
    name="api-card"
    tag="div"
    class="api-card-grid"
    appear
  >
    <APICard
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
      :cost-credits="item.costCredits"
      :total-calls="item.totalCalls"
      class="api-card-item"
      :style="{ animationDelay: `${Math.min(index, 12) * 40}ms` }"
    />
  </TransitionGroup>
</template>
