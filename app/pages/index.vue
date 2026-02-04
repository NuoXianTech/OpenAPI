<script lang="ts" setup>
const { result, getApi } = useGetApi();

try {
  await getApi();
} catch (e) {
  console.log("获取api失败", e);
}
</script>

<template>
  <ClientOnly>
    <AppHeader />
    <main class="max-w-275 mx-auto px-5 pb-6">
      <!-- 2. 状态卡片组件 -->
      <RunTimeCard :start-time="useRuntimeConfig().public.startTime" />
      <ApiList />
    </main>
  </ClientOnly>
</template>
