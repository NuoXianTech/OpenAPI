<script setup lang="ts">
definePageMeta({ layout: 'user', middleware: 'auth-user' })

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

const items = ref<Notification[]>([])
const expandedId = ref<number | null>(null)
const onlyUnread = ref(false)
const loading = ref(false)

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
    } catch { /* ignore */ }
  }
  expandedId.value = expandedId.value === n.id ? null : n.id
}

async function markAllRead() {
  await $fetch('/api/notifications/mark-all-read', { method: 'POST' })
  items.value.forEach((n) => {
    if (!n.isRead) {
      n.isRead = true
      n.readAt = new Date().toISOString()
    }
  })
}

watch(onlyUnread, () => {
  void fetchList()
})
onMounted(() => {
  void fetchList()
})

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

const unreadCount = computed(() => items.value.filter(n => !n.isRead).length)
</script>

<template>
  <UDashboardPanel id="user-notifications">
    <template #header>
      <UDashboardNavbar title="消息通知">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <USwitch
            v-model="onlyUnread"
            label="只看未读"
          />
          <UButton
            v-if="unreadCount > 0"
            icon="i-mdi-check-all"
            size="sm"
            variant="outline"
            color="neutral"
            @click="markAllRead"
          >
            全部已读
          </UButton>
          <DashboardHeaderActions
            :on-refresh="fetchList"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard class="shadow-sm">
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
          {{ onlyUnread ? '没有未读消息' : '暂无消息' }}
        </div>
        <div
          v-else
          class="divide-y divide-default -my-4"
        >
          <button
            v-for="n in items"
            :key="n.id"
            type="button"
            class="w-full text-left py-3 px-1 hover:bg-elevated/40 transition-colors flex flex-col gap-1.5"
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
                class="size-2 rounded-full bg-primary shrink-0"
              />
              <span class="font-medium truncate flex-1">
                {{ n.title }}
              </span>
              <span class="text-xs text-muted shrink-0">
                {{ formatDate(n.createdAt) }}
              </span>
            </div>
            <div class="text-xs text-muted">
              来自：{{ n.senderActor || '系统' }}
            </div>
            <div
              v-if="expandedId === n.id"
              class="mt-1 text-sm whitespace-pre-wrap leading-6"
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
      </UCard>
    </template>
  </UDashboardPanel>
</template>
