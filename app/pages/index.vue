<template>
  <main class="max-w-275 mx-auto px-5 pb-6">
    <!-- 2. 状态卡片组件 -->
    <ClientOnly>
      <StatusCard :start-time="useRuntimeConfig().public.startTime" />

      <ApiItem
        :key="item.id"
        :name="item.name"
        :description="item.description"
        :docurl="item.docurl"
        :url="item.url"
        :method="item.method"
        :count="item.count"
        :status="item.status"
        v-for="item in result.data"
      />
    </ClientOnly>
    <div>
      测试用api: <a class="text-red-300" href="/api/v1/test">点击测试</a>
    </div>
  </main>
</template>

<script lang="ts" setup>
const { result, getApi } = useGetApi();

try {
  getApi();
} catch (e) {
  console.log("获取api失败", e);
}
</script>

<style></style>
