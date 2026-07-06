<script setup lang="ts">
import type { ApiCatalogItem } from '#shared/types/api'

interface ApiListProps {
  items?: ApiCatalogItem[]
}

const { items = [] } = defineProps<ApiListProps>()
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
        :http-method="item.httpMethod"
        :api-path="item.apiPath"
        :doc-url="item.docUrl"
        :is-api-key="item.isApiKey"
        :method-costs="item.methodCosts"
        :total-calls="item.totalCalls"
        class="api-card-item"
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
