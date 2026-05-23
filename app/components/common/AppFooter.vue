<template>
  <footer class="text-center pb-10 text-xs text-muted mt-6">
    <div class="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <UButton
        to="/friend-links"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        友情链接
      </UButton>
      <UButton
        to="/stats"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        调用统计
      </UButton>
      <UButton
        to="/admin/login"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        管理入口
      </UButton>
    </div>
    <span>© 2019-{{ new Date().getFullYear() }} <a
      href="#"
      class="hover:underline"
    >nuoxian</a>. All Rights Reserved.</span>
  </footer>
</template>
