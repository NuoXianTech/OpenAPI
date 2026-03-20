<script lang="ts" setup>
import type { PropType } from 'vue'

const { items } = defineProps({
  items: { type: Array as PropType<any[]>, default: () => [] },
})
</script>

<template>
  <main class="grid grid-cols-12 gap-4 items-start">
    <APICard
      v-for="(item, index) in items"
      :key="item.id ?? index"
      :name="item.name"
      :status="item.status"
      :short-desc="item.short_desc || item.shortDesc"
      :description="item.description"
      :category="item.category || ''"
      :http-method="item.http_method || item.method || item.httpMethod"
      :api-path="item.api_path || item.url || item.apiPath"
      :doc-url="item.doc_url || item.docurl || item.docUrl"
      :is-api-key="item.is_api_key || item.isApiKey || false"
      :total-calls="item.total_calls || item.totalCalls || 0"
    />
  </main>
</template>
