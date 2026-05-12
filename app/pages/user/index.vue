<script setup lang="ts">
definePageMeta({ layout: 'user', middleware: 'auth-user' })

const { user } = useAuth()

const { data: callsData, refresh: refreshCalls, status: callsStatus } = useLazyFetch<{ total: number, success: number, failure: number }>('/api/user/calls/summary', {
  default: () => ({ total: 0, success: 0, failure: 0 })
})
const { data: keysData, refresh: refreshKeys, status: keysStatus } = useLazyFetch<Array<{ id: number, isActive: boolean }>>('/api/user/apikeys/list', {
  default: () => []
})
const { data: notifData, refresh: refreshNotifs, status: notifStatus } = useLazyFetch<Array<{ id: number, title: string, level: 'info' | 'success' | 'warning' | 'critical', isRead: boolean, createdAt: string }>>('/api/notifications/list', {
  default: () => [],
  query: { limit: 5 }
})

const summary = computed(() => callsData.value || { total: 0, success: 0, failure: 0 })
const successRate = computed(() => {
  if (!summary.value.total) return '0%'
  return `${((summary.value.success / summary.value.total) * 100).toFixed(1)}%`
})

const keys = computed(() => keysData.value || [])
const activeKeys = computed(() => keys.value.filter(k => k.isActive).length)

const recentNotifs = computed(() => notifData.value || [])

const credits = computed(() => Number(user.value?.credits ?? 0))

const refreshing = computed(() => callsStatus.value === 'pending' || keysStatus.value === 'pending' || notifStatus.value === 'pending')

async function refresh() {
  await Promise.all([refreshCalls(), refreshKeys(), refreshNotifs()])
}

const levelMeta: Record<'info' | 'success' | 'warning' | 'critical', { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '通知' },
  success: { color: 'success', label: '成功' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' }
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
  <UDashboardPanel id="user-overview">
    <template #header>
      <UDashboardNavbar title="概览">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="refreshing"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <DashboardPageHeader
          icon="i-mdi-hand-wave"
          :title="`你好，${user?.username || ''}`"
          description="这里是你的个人中心，你可以管理 API Key、查看调用统计和处理通知。"
        />

        <DashboardStatGrid>
          <DashboardStatCard
            label="积分"
            :value="credits.toLocaleString()"
            icon="i-mdi-cash-multiple"
            icon-color="text-success"
            to="/user/wallet"
          />
          <DashboardStatCard
            label="总调用"
            :value="summary.total.toLocaleString()"
            icon="i-mdi-chart-line"
            icon-color="text-primary"
            to="/user/calls"
          />
          <DashboardStatCard
            label="成功率"
            :value="successRate"
            icon="i-mdi-percent"
            icon-color="text-info"
            to="/user/calls"
          />
          <DashboardStatCard
            label="活跃 API Key"
            :value="`${activeKeys} / ${keys.length}`"
            icon="i-mdi-key-outline"
            icon-color="text-warning"
            to="/user/apikeys"
          />
        </DashboardStatGrid>

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
          <DashboardEmpty
            v-if="recentNotifs.length === 0"
            icon="i-mdi-bell-off-outline"
            title="暂无通知"
          />
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
