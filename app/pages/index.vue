<template>
  <main class="max-w-275 mx-auto px-5 pb-6">
    <!-- 2. 状态卡片组件 -->
    <ClientOnly>
      <StatusCard :start-time="useRuntimeConfig().public.startTime" />
      <ApiItem />
    </ClientOnly>
    <div>
      测试用api: <a class="text-red-300" href="/api/v1/test">点击测试</a>
    </div>
  </main>
</template>

<script lang="ts" setup></script>

<style></style>
