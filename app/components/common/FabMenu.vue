<script lang="ts" setup>
const isOpen = ref(false)

const openLink = (url: string) => {
  window.open(url, '_blank')
  isOpen.value = false
}
</script>

<template>
  <div>
    <!-- FAB 按钮 -->
    <div class="fixed right-5 bottom-5 z-[120]">
      <button
        class="fab-btn inline-flex items-center justify-center w-14 h-14 rounded-full border border-border shadow-[0_10px_24px_rgba(0,0,0,0.08)] cursor-pointer backdrop-blur-[6px] outline-none hover:-translate-y-0.5"
        :class="isOpen ? 'bg-white' : 'bg-white/90'"
        @click="isOpen = !isOpen"
      >
        <div
          class="transition-transform duration-300 flex items-center justify-center"
          :class="isOpen ? 'rotate-45' : ''"
        >
          <span
            class="iconify w-6 h-6"
            data-icon="mdi:plus"
          />
        </div>
      </button>
    </div>

    <!-- 遮罩 -->
    <div
      class="fixed inset-0 bg-black/20 z-[110] transition-opacity duration-200"
      :class="isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click="isOpen = false"
    />

    <!-- 菜单 -->
    <nav
      class="fixed right-5 bottom-[88px] z-[121] w-[280px] bg-surface border border-border rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-200"
      :class="
        isOpen
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2.5 opacity-0 pointer-events-none'
      "
    >
      <div class="p-2.5 grid gap-1.5">
        <div
          class="grid grid-cols-[24px_1fr_auto] gap-2 items-center p-2.5 rounded-[10px] border border-border cursor-pointer hover:bg-bg"
          @click="openLink('#')"
        >
          <span
            class="iconify w-[18px] h-[18px]"
            data-icon="mdi:clipboard-text-multiple"
          />
          <div>
            <div class="font-semibold text-[13px]">
              服务条款
            </div>
            <div class="text-xs text-muted">
              Terms of Service
            </div>
          </div>
          <div class="text-xs text-muted">
            打开
          </div>
        </div>
        <div
          class="grid grid-cols-[24px_1fr_auto] gap-2 items-center p-2.5 rounded-[10px] border border-border cursor-pointer hover:bg-bg"
          @click="openLink('#')"
        >
          <span
            class="iconify w-4.5 h-4.5"
            data-icon="mdi:qqchat"
          />
          <div>
            <div class="font-semibold text-[13px]">
              联系我们
            </div>
            <div class="text-xs text-muted">
              加入 QQ 群
            </div>
          </div>
          <div class="text-xs text-muted">
            加群
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>
