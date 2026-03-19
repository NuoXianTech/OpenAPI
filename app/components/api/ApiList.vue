<script lang="ts" setup>
import { PropType } from 'vue'

const { items } = defineProps({
  items: { type: Array as PropType<any[]>, default: () => [] },
})
</script>

<template>
  <main class="grid grid-cols-12 gap-4 items-start">
    <APICard
      :name="'接口总览'"
      :status="1"
      :shortDesc="'共100个接口，10个异常接口'"
      :docUrl="'接口总览描述接口'"
      :isApiKey="true"
      :apiPath="'/v1/123'"
      :httpMethod="'GET'"
      :description="'这是接口总览的描述信息，展示接口的总体情况，包括接口数量、异常接口数量等。'"
    />
    <APICard
      :name="'接口总览'"
      :status="1"
      :shortDesc="'共100个接口，10个异常接口'"
      :docUrl="'接口总览描述接口'"
      :isApiKey="true"
      :apiPath="'/v1/123'"
      :httpMethod="'GET'"
      :description="'这是接口总览的描述信息，展示接口的总体情况，包括接口数量、异常接口数量等。'"
    />
    <APICard
      v-for="(item, index) in items"
      :key="item.id ?? index"
      :name="item.name"
      :status="item.status"
      :short-desc="item.short_desc || item.shortDesc"
      :description="item.description"
      :http-method="item.http_method || item.method || item.httpMethod"
      :api-path="item.api_path || item.url || item.apiPath"
      :doc-url="item.doc_url || item.docurl || item.docUrl"
      :is-api-key="item.is_api_key || item.isApiKey || false"
    />
  </main>
</template>
