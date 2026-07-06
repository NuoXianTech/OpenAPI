<script setup lang="ts">
import { NOTIFICATION_LEVEL_META as levelMeta } from '~/types/message-level'
/**
 * 后台站内信通知中心（admin / user 两端共用）
 *
 * - 头像旁铃铛 + 未读角标（轮询 60s）
 * - 点击从右侧滑出 Slideover，承载完整通知列表，替代独立页面
 * - 支持「只看未读 / 全部已读 / 展开详情 / 跳转链接」
 *
 * per-user 私有数据：全部走组件本地 ref + $fetch，不进 SSR payload。
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

const open = ref(false)
const items = ref<Notification[]>([])
const unread = ref(0)
const loading = ref(false)
const onlyUnread = ref(false)
const expandedId = ref<number | null>(null)

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
      query: { limit: 200, unread: onlyUnread.value ? '1' : '0' }
    })
    items.value = res || []
  } finally {
    loading.value = false
  }
}

async function toggleRead(n: Notification) {
  if (!n.isRead) {
    try {
      await $fetch('/api/notifications/mark-read', { method: 'POST', body: { id: n.id } })
      n.isRead = true
      n.readAt = new Date().toISOString()
      unread.value = Math.max(0, unread.value - 1)
    } catch { /* ignore */ }
  }
  expandedId.value = expandedId.value === n.id ? null : n.id
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

watch(onlyUnread, () => {
  if (open.value) void fetchList()
})

// 未读角标仅在客户端拉取并轮询：避免 SSR 阶段请求 per-user 私有数据并写入 payload
useIntervalFn(fetchUnreadCount, 60_000)
onMounted(() => {
  void fetchUnreadCount()
})
</script>

<template>
  <USlideover
    v-model:open="open"
    title="消息通知"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      square
      class="relative"
      aria-label="消息通知"
    >
      <UIcon
        name="i-lucide-bell"
        class="size-5"
      />
      <span
        v-if="unread > 0"
        class="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-error text-inverted text-[10px] leading-none font-semibold"
      >
        {{ unread > 99 ? '99+' : unread }}
      </span>
    </UButton>

    <template #actions>
      <UBadge
        v-if="unread > 0"
        color="error"
        variant="subtle"
        size="sm"
      >
        {{ unread }} 未读
      </UBadge>
      <UButton
        v-if="unread > 0"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-check-check"
        @click="markAllRead"
      >
        全部已读
      </UButton>
    </template>

    <template #body>
      <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default bg-default/80 px-4 py-2.5 backdrop-blur">
        <USwitch
          v-model="onlyUnread"
          label="只看未读"
          size="sm"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="刷新"
          @click="fetchList"
        />
      </div>

      <div
        v-if="loading && items.length === 0"
        class="py-12 text-center text-sm text-muted"
      >
        加载中…
      </div>
      <UEmpty
        v-else-if="items.length === 0"
        variant="naked"
        icon="i-lucide-bell"
        :title="onlyUnread ? '没有未读消息' : '暂无消息'"
        description="新的通知会显示在这里"
        class="py-12"
      />

      <div
        v-else
        class="divide-y divide-default"
      >
        <button
          v-for="n in items"
          :key="n.id"
          type="button"
          class="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-elevated/50"
          :class="{ 'bg-primary/5': !n.isRead }"
          @click="toggleRead(n)"
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
              class="size-2 shrink-0 rounded-full bg-primary"
              aria-label="未读"
            />
            <span class="flex-1 truncate text-sm font-medium">
              {{ n.title }}
            </span>
            <span class="shrink-0 text-xs text-muted">
              {{ formatDateTime(n.createdAt) }}
            </span>
          </div>
          <div class="text-xs text-muted">
            来自：{{ n.senderActor || '系统' }}
          </div>
          <div
            v-if="expandedId === n.id"
            class="mt-1 whitespace-pre-wrap text-sm leading-6 text-default"
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
                icon="i-lucide-external-link"
                trailing
                @click.stop
              >
                查看详情
              </UButton>
            </div>
          </div>
        </button>
      </div>
    </template>
  </USlideover>
</template>
