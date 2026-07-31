<script setup lang="ts">
import type { ApiCatalogItem, ApiCategoryItem } from '#shared/types/api'

interface ApiCardGridProps {
  apis?: ApiCatalogItem[]
  categoryMap?: Record<number, ApiCategoryItem>
}

const { apis = [], categoryMap = {} } = defineProps<ApiCardGridProps>()
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
        v-for="api in apis"
        :key="api.id"
        :name="api.name"
        :status="api.status"
        :category-name="api.categoryId == null ? '' : categoryMap[api.categoryId]?.name"
        :short-desc="api.shortDesc"
        :description="api.description"
        :http-method="api.httpMethod"
        :api-path="api.apiPath"
        :doc-url="api.docUrl"
        :is-api-key="api.isApiKey"
        :method-costs="api.methodCosts"
        :total-calls="api.totalCalls"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.api-card-grid {
  contain: layout style;
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

.api-card-enter-active,
.api-card-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.api-card-enter-from,
.api-card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.api-card-move {
  transition: transform 180ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .api-card-enter-active,
  .api-card-leave-active,
  .api-card-move {
    transition: none;
  }
}
</style>
