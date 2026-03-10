<template>
  <ClientOnly>
    <CommonAppHeader />
    <main class="max-w-275 mx-auto px-5 pb-6">
      <!-- API运行时间卡片组件 -->
      <ApiRunTimeCard :start-time="useRuntimeConfig().public.startTime" />
      <ApiList />
    </main>
    <CommonAppFooter />
  </ClientOnly>
</template>
