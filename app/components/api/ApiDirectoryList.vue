<script setup lang="ts">
import type { ApiCatalogItem, ApiCategoryItem } from '#shared/types/api'

interface ApiDirectoryListProps {
  apis?: ApiCatalogItem[]
  categoryMap?: Record<number, ApiCategoryItem>
}

const props = withDefaults(defineProps<ApiDirectoryListProps>(), {
  apis: () => [],
  categoryMap: () => ({})
})
</script>

<template>
  <ul class="api-directory-list">
    <li
      v-for="api in props.apis"
      :key="api.id"
    >
      <ApiDirectoryItem
        :api="api"
        :category-name="api.categoryId == null ? '' : props.categoryMap[api.categoryId]?.name"
      />
    </li>
  </ul>
</template>

<style scoped>
.api-directory-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
