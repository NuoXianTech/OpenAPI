<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { data, status } = await useFetch('/api/admin/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0, items: [] } })
})

const stats = computed(() => data.value?.data || { total: 0, success: 0, failure: 0, items: [] })
const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用次数', value: stats.value.total.toLocaleString(), icon: 'i-mdi-chart-line' },
  { label: '成功调用', value: stats.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline' },
  { label: '失败调用', value: stats.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent' },
])
</script>

<template>
  <UDashboardPanel id="admin-home">
    <template #header>
      <UDashboardNavbar title="仪表盘">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <UCard
          v-for="card in overviewCards"
          :key="card.label"
          class="shadow-sm"
        >
          <div class="flex items-center gap-3 px-1">
            <div class="flex items-center justify-center size-10 rounded-lg bg-default border border-default shrink-0">
              <UIcon :name="card.icon" class="size-5 text-muted" />
            </div>
            <div>
              <p class="text-xs text-muted">{{ card.label }}</p>
              <p class="text-xl font-semibold tabular-nums mt-0.5">{{ card.value }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard class="shadow-sm">
        <div class="px-1">
          <h3 class="font-semibold mb-1">快捷操作</h3>
          <p class="text-sm text-muted mb-4">常用管理功能快速入口</p>
          <div class="flex flex-wrap gap-2">
            <UButton variant="outline" color="neutral" to="/admin/apis" icon="i-mdi-api">
              API 管理
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/users" icon="i-mdi-account-group-outline">
              用户管理
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/friend-links" icon="i-mdi-link-variant">
              友情链接
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/settings" icon="i-mdi-cog-outline">
              站点设置
            </UButton>
          </div>
        </div>
      </UCard>

      <div v-if="status === 'pending'" class="text-center text-sm text-muted py-8">
        加载中...
      </div>
    </template>
  </UDashboardPanel>
</template>
