<script setup lang="ts">
definePageMeta({ layout: 'user', middleware: 'auth-user' })

const { user } = useAuth()

const { data: callsData } = await useFetch('/api/user/calls/summary', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0 } }),
})
const { data: keysData } = await useFetch('/api/user/apikeys/list', {
  default: () => ({ code: 0, msg: '', data: [] as Array<{ id: number, isActive: boolean }> }),
})
const { data: unreadData } = await useFetch('/api/notifications/unread-count', {
  default: () => ({ code: 0, msg: '', data: { count: 0 } }),
})
const { data: notifData } = await useFetch('/api/notifications/list', {
  default: () => ({ code: 0, msg: '', data: [] as Array<{ id: number, title: string, level: 'info' | 'success' | 'warning' | 'critical', isRead: boolean, createdAt: string }> }),
  query: { limit: 5 },
})

const summary = computed(() => callsData.value?.data || { total: 0, success: 0, failure: 0 })
const successRate = computed(() => {
  if (!summary.value.total) return '0%'
  return `${((summary.value.success / summary.value.total) * 100).toFixed(1)}%`
})

const keys = computed(() => keysData.value?.data || [])
const activeKeys = computed(() => keys.value.filter(k => k.isActive).length)

const unreadCount = computed(() => unreadData.value?.data?.count || 0)
const recentNotifs = computed(() => notifData.value?.data || [])

const credits = computed(() => Number((user.value as any)?.credits ?? 0))

const overviewCards = computed(() => [
  { label: '余额', value: credits.value.toLocaleString(), icon: 'i-mdi-cash-multiple', color: 'text-success', to: '/user/wallet' },
  { label: '总调用', value: summary.value.total.toLocaleString(), icon: 'i-mdi-chart-line', color: 'text-primary', to: '/user/calls' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent', color: 'text-info', to: '/user/calls' },
  { label: '活跃 API Key', value: `${activeKeys.value} / ${keys.value.length}`, icon: 'i-mdi-key-outline', color: 'text-warning', to: '/user/apikeys' },
])

const levelMeta: Record<'info' | 'success' | 'warning' | 'critical', { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '通知' },
  success: { color: 'success', label: '成功' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' },
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }) }
  catch { return iso }
}
</script>

<template>
  <UDashboardPanel id="user-overview">
    <template #header>
      <UDashboardNavbar title="概览">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UCard>
          <div class="flex items-center gap-4">
            <span class="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UIcon
                name="i-mdi-hand-wave"
                class="size-6"
              />
            </span>
            <div>
              <div class="text-lg font-semibold">
                你好，{{ user?.username }}
              </div>
              <div class="text-sm text-muted">
                这里是你的个人中心，你可以管理 API Key、查看调用统计和处理通知。
              </div>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="card in overviewCards"
            :key="card.label"
            :to="card.to"
            class="block"
          >
            <UCard class="hover:border-primary/40 hover:shadow transition-all">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-muted">
                    {{ card.label }}
                  </p>
                  <p class="text-2xl font-semibold tabular-nums mt-1">
                    {{ card.value }}
                  </p>
                </div>
                <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
                  <UIcon
                    :name="card.icon"
                    :class="card.color"
                    class="size-5"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-mdi-bell-outline"
                  class="size-5 text-muted"
                />
                <h3 class="font-semibold">
                  最近通知
                </h3>
              </div>
              <UButton
                to="/user/notifications"
                size="xs"
                variant="ghost"
                color="neutral"
                trailing-icon="i-mdi-chevron-right"
              >
                查看全部
              </UButton>
            </div>
          </template>
          <div
            v-if="recentNotifs.length === 0"
            class="text-center text-sm text-muted py-8"
          >
            暂无通知
          </div>
          <div
            v-else
            class="divide-y divide-default -my-3"
          >
            <NuxtLink
              v-for="n in recentNotifs"
              :key="n.id"
              to="/user/notifications"
              class="flex items-center gap-3 py-3 hover:bg-elevated/40 px-1 rounded"
              :class="{ 'bg-primary/5': !n.isRead }"
            >
              <UBadge
                :color="levelMeta[n.level].color"
                variant="subtle"
                size="sm"
              >
                {{ levelMeta[n.level].label }}
              </UBadge>
              <span
                v-if="!n.isRead"
                class="size-2 rounded-full bg-primary shrink-0"
              />
              <span class="font-medium truncate flex-1 text-sm">
                {{ n.title }}
              </span>
              <span class="text-xs text-muted shrink-0">
                {{ formatDate(n.createdAt) }}
              </span>
            </NuxtLink>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
