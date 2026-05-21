<script setup lang="ts">
/**
 * 后台通用站内信铃铛
 *
 * - 角标：未读条数（轮询 60s）
 * - 点击打开 popover，展示最新若干条；左上"全部已读"
 * - 底部"查看全部"链接由 :to 决定
 */

interface Notification {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  linkUrl: string | null
  isRead: boolean
  readAt: string | null
  senderActor: string | null
  createdAt: string
}

const props = withDefaults(defineProps<{
  to?: string
}>(), {
  to: '/user/notifications'
})

const open = ref(false)
const expandedId = ref<number | null>(null)
const items = ref<Notification[]>([])
const unread = ref(0)
const loading = ref(false)

async function fetchUnreadCount() {
  try {
    const res = await $fetch<{ count: number }>('/api/notifications/unread-count')
    unread.value = res.count
  } catch { /* ignore */ }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await $fetch<Notification[]>('/api/notifications/list', {
      query: { limit: 20 }
    })
    items.value = res || []
  } finally {
    loading.value = false
  }
}

async function markRead(item: Notification) {
  if (item.isRead) {
    expandedId.value = expandedId.value === item.id ? null : item.id
    return
  }
  try {
    await $fetch('/api/notifications/mark-read', { method: 'POST', body: { id: item.id } })
    item.isRead = true
    item.readAt = new Date().toISOString()
    unread.value = Math.max(0, unread.value - 1)
    expandedId.value = item.id
  } catch { /* ignore */ }
}

async function markAllRead() {
  try {
    await $fetch('/api/notifications/mark-all-read', { method: 'POST' })
    items.value.forEach((n) => {
      if (!n.isRead) {
        n.isRead = true
        n.readAt = new Date().toISOString()
      }
    })
    unread.value = 0
  } catch { /* ignore */ }
}

watch(open, (val) => {
  if (val) void fetchList()
})

useIntervalFn(fetchUnreadCount, 60_000, { immediateCallback: true })

const levelMeta: Record<Notification['level'], { color: 'info' | 'success' | 'warning' | 'error', icon: string, label: string }> = {
  info: { color: 'info', icon: 'i-mdi-information-outline', label: '通知' },
  success: { color: 'success', icon: 'i-mdi-check-circle-outline', label: '成功' },
  warning: { color: 'warning', icon: 'i-mdi-alert-outline', label: '提醒' },
  critical: { color: 'error', icon: 'i-mdi-alert-circle-outline', label: '紧急' }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', collisionPadding: 12, sideOffset: 8 }"
    :ui="{ content: 'w-96 max-w-[calc(100vw-2rem)]' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      square
      class="relative"
      aria-label="消息通知"
    >
      <UIcon
        name="i-mdi-bell-outline"
        class="size-5"
      />
      <span
        v-if="unread > 0"
        class="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-error text-inverted text-[10px] leading-none font-semibold"
      >
        {{ unread > 99 ? '99+' : unread }}
      </span>
    </UButton>

    <template #content>
      <div class="flex flex-col max-h-[70vh]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-default">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-mdi-bell-outline"
              class="size-4 text-muted"
            />
            <span class="text-sm font-semibold">消息通知</span>
            <UBadge
              v-if="unread > 0"
              color="error"
              variant="subtle"
              size="sm"
            >
              {{ unread }} 未读
            </UBadge>
          </div>
          <UButton
            v-if="unread > 0"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-mdi-check-all"
            @click="markAllRead"
          >
            全部已读
          </UButton>
        </div>

        <div
          v-if="loading && items.length === 0"
          class="text-center text-sm text-muted py-12"
        >
          加载中...
        </div>
        <div
          v-else-if="items.length === 0"
          class="text-center text-sm text-muted py-12"
        >
          暂无消息
        </div>

        <div
          v-else
          class="overflow-y-auto divide-y divide-default"
        >
          <button
            v-for="n in items"
            :key="n.id"
            type="button"
            class="w-full text-left px-4 py-3 hover:bg-elevated/50 transition-colors flex flex-col gap-1.5"
            :class="{ 'bg-primary/5': !n.isRead }"
            @click="markRead(n)"
          >
            <div class="flex items-center gap-2">
              <UBadge
                :color="levelMeta[n.level].color"
                variant="subtle"
                size="sm"
              >
                <UIcon
                  :name="levelMeta[n.level].icon"
                  class="size-3"
                />
                <span class="ml-1">{{ levelMeta[n.level].label }}</span>
              </UBadge>
              <span
                v-if="!n.isRead"
                class="size-2 rounded-full bg-primary shrink-0"
                aria-label="未读"
              />
              <span class="text-sm font-medium truncate flex-1">
                {{ n.title }}
              </span>
            </div>
            <div class="text-xs text-muted">
              {{ n.senderActor || '系统' }} · {{ formatDate(n.createdAt) }}
            </div>
            <div
              v-if="expandedId === n.id"
              class="mt-1 text-sm whitespace-pre-wrap leading-6 text-default"
            >
              {{ n.content }}
              <div
                v-if="n.linkUrl"
                class="mt-2"
              >
                <UButton
                  :to="n.linkUrl"
                  target="_blank"
                  size="xs"
                  variant="outline"
                  icon="i-mdi-open-in-new"
                  trailing
                >
                  查看详情
                </UButton>
              </div>
            </div>
          </button>
        </div>

        <div class="border-t border-default px-3 py-2 text-center">
          <UButton
            :to="props.to"
            size="xs"
            variant="ghost"
            color="neutral"
            block
            @click="open = false"
          >
            查看全部
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
