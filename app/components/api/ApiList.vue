<script lang="ts" setup>
import type { PropType } from 'vue'

const { items, categoryMap } = defineProps({
  items: { type: Array as PropType<any[]>, default: () => [] },
  categoryMap: { type: Object as PropType<Map<number, { name: string }>>, default: () => new Map() },
})

function resolveCategoryName(id: number | null | undefined) {
  if (typeof id !== 'number') {
    return ''
  }
  return categoryMap.get(id)?.name || ''
}
</script>

<template>
  <TransitionGroup
    name="api-card"
    tag="main"
    class="grid grid-cols-12 gap-4 items-start api-card-grid"
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
      :total-calls="item.totalCalls"
      class="api-card-item"
    />
  </TransitionGroup>
</template>
