<script setup lang="ts">
import { NOTIFICATION_LEVEL_META as levelMeta, type MessageLevel } from '#shared/types/content'
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
  level: MessageLevel
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
const { t, locale } = useI18n()

function getNotificationLevelLabel(level: MessageLevel): string {
  return t(`common.notifications.levels.${level}`)
}

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
    :title="$t('common.notifications.title')"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      square
      class="relative"
      :aria-label="$t('common.notifications.title')"
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

    <template #actions>
      <UBadge
        v-if="unread > 0"
        color="error"
        variant="subtle"
        size="sm"
      >
        {{ $t('common.notifications.unreadCount', { count: unread.toLocaleString(locale) }) }}
      </UBadge>
      <UButton
        v-if="unread > 0"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-mdi-check-all"
        @click="markAllRead"
      >
        {{ $t('common.notifications.markAllRead') }}
      </UButton>
    </template>

    <template #body>
      <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default bg-default/80 px-4 py-2.5 backdrop-blur">
        <USwitch
          v-model="onlyUnread"
          :label="$t('common.notifications.onlyUnread')"
          size="sm"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-mdi-refresh"
          :loading="loading"
          :aria-label="$t('common.actions.refresh')"
          @click="fetchList"
        />
      </div>

      <div
        v-if="loading && items.length === 0"
        class="py-12 text-center text-sm text-muted"
      >
        {{ $t('common.states.loading') }}
      </div>
      <UEmpty
        v-else-if="items.length === 0"
        variant="naked"
        icon="i-mdi-bell-outline"
        :title="onlyUnread ? $t('common.notifications.noUnread') : $t('common.notifications.empty')"
        :description="$t('common.notifications.emptyDescription')"
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
              <span class="ml-1">{{ getNotificationLevelLabel(n.level) }}</span>
            </UBadge>
            <span
              v-if="!n.isRead"
              class="size-2 shrink-0 rounded-full bg-primary"
              :aria-label="$t('common.notifications.unread')"
            />
            <span class="flex-1 truncate text-sm font-medium">
              {{ n.title }}
            </span>
            <span class="shrink-0 text-xs text-muted">
              {{ formatDateTime(n.createdAt, '-', locale) }}
            </span>
          </div>
          <div class="text-xs text-muted">
            {{ $t('common.notifications.from', { sender: n.senderActor || $t('common.notifications.system') }) }}
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
                icon="i-mdi-open-in-new"
                trailing
                @click.stop
              >
                {{ $t('common.actions.viewDetails') }}
              </UButton>
            </div>
          </div>
        </button>
      </div>
    </template>
  </USlideover>
</template>
