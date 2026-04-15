<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { data, status, refresh } = await useFetch('/api/admin/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0, items: [] } }),
})

const stats = computed(() => data.value?.data || { total: 0, success: 0, failure: 0, items: [] })
const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用次数', value: stats.value.total.toLocaleString(), icon: 'i-mdi-chart-line', trend: '+12.5%', trendUp: true },
  { label: '成功调用', value: stats.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline', trend: '+8.2%', trendUp: true },
  { label: '失败调用', value: stats.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline', trend: '-3.1%', trendUp: false },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent', trend: '+1.2%', trendUp: true },
])

const recentItems = computed(() => {
  const items = stats.value.items || []
  return items.slice(0, 8)
})

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <UDashboardPanel id="admin-home">
    <template #header>
      <UDashboardNavbar title="仪表盘">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-mdi-refresh"
            :loading="status === 'pending'"
            @click="refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Overview Stats -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard
          v-for="card in overviewCards"
          :key="card.label"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted">{{ card.label }}</p>
              <p class="text-2xl font-semibold tabular-nums mt-1">{{ card.value }}</p>
            </div>
            <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
              <UIcon :name="card.icon" class="size-5 text-muted" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-1 text-xs">
            <UIcon
              :name="card.trendUp ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
              :class="card.trendUp ? 'text-green-500' : 'text-red-500'"
              class="size-4"
            />
            <span :class="card.trendUp ? 'text-green-500' : 'text-red-500'">{{ card.trend }}</span>
            <span class="text-muted">较昨日</span>
          </div>
        </UCard>
      </div>

      <!-- Quick Actions + Recent Stats -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Quick Actions -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">快捷操作</h3>
            </div>
          </template>
          <div class="space-y-1">
            <UButton
              v-for="link in [
                { label: 'API 管理', icon: 'i-mdi-api', to: '/admin/apis' },
                { label: '用户管理', icon: 'i-mdi-account-group-outline', to: '/admin/users' },
                { label: '友情链接', icon: 'i-mdi-link-variant', to: '/admin/friend-links' },
                { label: 'FAB 菜单', icon: 'i-mdi-plus-circle-outline', to: '/admin/fab-menu' },
                { label: '站点设置', icon: 'i-mdi-cog-outline', to: '/admin/settings' },
              ]"
              :key="link.to"
              :label="link.label"
              :icon="link.icon"
              :to="link.to"
              variant="ghost"
              color="neutral"
              block
              class="justify-start"
            />
          </div>
        </UCard>

        <!-- Recent Call Stats -->
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">最近调用统计</h3>
              <UButton label="查看全部" variant="link" size="sm" to="/admin/calls" trailing-icon="i-mdi-arrow-right" />
            </div>
          </template>
          <div v-if="recentItems.length === 0" class="text-sm text-muted text-center py-6">
            暂无统计数据
          </div>
          <div v-else class="divide-y divide-default">
            <div v-for="item in recentItems" :key="item.id" class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="text-sm font-mono truncate">{{ item.apiPath || '-' }}</p>
                <p class="text-xs text-muted mt-0.5">{{ formatDate(item.statDate) }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <div class="text-right">
                  <p class="text-sm font-medium tabular-nums">{{ item.totalCount?.toLocaleString() }}</p>
                  <p class="text-xs text-muted">调用</p>
                </div>
                <UBadge v-if="item.failureCount > 0" color="error" variant="subtle" size="sm">
                  {{ item.failureCount }} 失败
                </UBadge>
                <UBadge v-else color="success" variant="subtle" size="sm">
                  正常
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
