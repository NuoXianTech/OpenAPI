<script lang="ts" setup>
const { result, getApi } = useGetApi();

try {
  await getApi();
} catch (e) {
  console.log("获取api失败", e);
}
</script>

<style></style>

<template>
  <main class="max-w-275 mx-auto px-5 pb-6">
    <!-- 2. 状态卡片组件 -->
    <ClientOnly>
      <StatusCard :start-time="useRuntimeConfig().public.startTime" />

      <ApiItem
        v-for="item in result.data"
        :code="item.code"
        :name="item.name"
        :status="item.status"
        :short-desc="item.short_desc"
        :description="item.description"
        :doc_url="item.doc_url"
        :api_path="item.api_path"
        :http_method="item.http_method"
      />
    </ClientOnly>
    <div>
      测试用api: <a class="text-red-300" href="/api/v1/test">点击测试</a>
    </div>
  </main>
</template>
