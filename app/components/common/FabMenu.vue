<script lang="ts" setup>
import type { FabMenuItem } from '~/composables/fab-menu/types'
import { useFabMenu } from '~/composables/fab-menu/useFabMenu'

const route = useRoute()
const { items, loadFabMenu } = useFabMenu()
const isOpen = ref(false)
const iframeItem = ref<FabMenuItem | null>(null)

const hiddenRoutes = ['/admin/login', '/login', '/register', '/verify-email']
const showFabMenu = computed(() => !route.path.startsWith('/admin') && !route.path.startsWith('/user') && !hiddenRoutes.includes(route.path))
const visibleItems = computed(() => items.value.filter(item => item.isActive).slice().sort((left, right) => left.sort - right.sort))

function closeAll() {
  isOpen.value = false
  iframeItem.value = null
}

async function openAction(item: FabMenuItem) {
  if (item.actionType === 'iframe') {
    iframeItem.value = item
    isOpen.value = false
    return
  }

  if (item.actionType === 'route') {
    isOpen.value = false
    await navigateTo(item.actionValue)
    return
  }

  if (import.meta.client) {
    window.open(item.actionValue, item.target || '_blank')
  }
  isOpen.value = false
}

function handleEsc(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeAll()
  }
}

watch(() => route.fullPath, closeAll)

onMounted(() => {
  void loadFabMenu()
  document.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEsc)
})
</script>

<template>
  <ClientOnly>
    <div v-if="showFabMenu && visibleItems.length">
      <div class="fixed right-5 bottom-5 z-[120]">
        <button
          class="fab-btn inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/90 text-text border border-border shadow-[0_10px_24px_rgba(0,0,0,0.08)] cursor-pointer backdrop-blur-[6px] transition-transform duration-200 outline-none hover:-translate-y-0.5"
          type="button"
          :aria-expanded="isOpen"
          aria-label="打开导航"
          title="导航"
          @click="isOpen = !isOpen"
        >
          <div
            class="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center"
            :class="isOpen ? 'rotate-45' : ''"
          >
            <span
              class="iconify w-6 h-6"
              data-icon="mdi:plus"
            />
          </div>
        </button>
      </div>

      <Transition name="fab-mask">
        <div
          v-if="isOpen"
          class="fixed inset-0 bg-black/20 z-[110]"
          @click="closeAll"
        />
      </Transition>

      <Transition name="fab-panel">
        <nav
          v-if="isOpen"
          class="fixed right-5 bottom-[88px] z-[121] w-[300px] max-w-[calc(100vw-2.5rem)] bg-surface border border-border rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          aria-hidden="false"
        >
          <div class="p-2.5 grid gap-1.5 max-h-[min(60vh,420px)] overflow-auto">
            <button
              v-for="item in visibleItems"
              :key="item.id"
              type="button"
              class="grid grid-cols-[24px_1fr_auto] gap-2 items-center w-full text-left p-2.5 rounded-[10px] border border-border cursor-pointer transition-colors duration-200 hover:bg-bg fab-menu-row"
              @click="openAction(item)"
            >
              <span
                class="iconify w-[18px] h-[18px]"
                :data-icon="item.icon || 'mdi:link-variant'"
              />
              <div class="min-w-0">
                <div class="font-semibold text-[13px] truncate">
                  {{ item.title }}
                </div>
                <div class="text-xs text-muted-foreground truncate">
                  {{ item.subtitle || item.actionValue }}
                </div>
              </div>
              <div class="text-xs text-muted-foreground whitespace-nowrap">
                {{ item.actionLabel }}
              </div>
            </button>
          </div>
        </nav>
      </Transition>

      <Teleport to="body">
        <Transition name="fab-modal">
          <div
            v-if="iframeItem"
            class="fixed inset-0 z-[140] flex items-center justify-center p-4"
            @click.self="iframeItem = null"
          >
            <div class="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
            <div class="relative z-[1] w-full max-w-[960px] h-[min(80vh,760px)] bg-surface border border-border rounded-[18px] shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
              <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg/60">
                <div>
                  <div class="font-semibold">
                    {{ iframeItem.title }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ iframeItem.subtitle || iframeItem.actionValue }}
                  </div>
                </div>
                <button
                  type="button"
                  class="auth-button auth-ghost"
                  @click="iframeItem = null"
                >
                  关闭
                </button>
              </div>
              <iframe
                :src="iframeItem.actionValue"
                class="w-full h-[calc(100%-57px)] border-0 bg-white"
                loading="lazy"
              />
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </ClientOnly>
</template>
