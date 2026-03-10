<script lang="ts" setup>
const { result, getApi } = useGetApi()

try {
  await getApi()
}
catch (e) {
  console.log('获取api失败', e)
}
</script>

<template>
  <main class="grid grid-cols-12 gap-4 items-start">
    <APICard
      v-for="item in result.data"
      :key="item.code"
      :name="item.name"
      :status="item.status"
      :short_desc="item.short_desc"
      :description="item.description"
      :http_method="item.http_method"
      :api_path="item.api_path"
      :doc_url="item.doc_url"
      :is_api_key="item.is_api_key"
    />
  </main>
</template>
