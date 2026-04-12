<script lang="ts" setup>
import { ref, computed } from 'vue'
import DashboardSidebar from '~/components/dashboard/DashboardSidebar.vue'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import DashboardUsers from '~/components/admin/DashboardUsers.vue'
import DashboardApis from '~/components/admin/DashboardApis.vue'
import DashboardCalls from '~/components/admin/DashboardCalls.vue'
import DashboardLinks from '~/components/admin/DashboardLinks.vue'
import DashboardFab from '~/components/admin/DashboardFab.vue'

definePageMeta({ middleware: 'auth-admin' })

const menuItems = [
  {
    key: 'users',
    title: '用户管理',
    icon: 'mdi:account-cog-outline',
  },
  {
    key: 'apis',
    title: '接口管理',
    icon: 'mdi:api',
  },
  {
    key: 'calls',
    title: '调用统计',
    icon: 'mdi:chart-line',
  },
  {
    key: 'links',
    title: '友情链接',
    icon: 'mdi:link-variant-plus',
  },
  {
    key: 'fab',
    title: 'FAB 菜单',
    icon: 'mdi:gesture-tap-button',
  },
]

const activeTab = ref('users')

const currentComponent = computed(() => {
  switch (activeTab.value) {
    case 'users':
      return DashboardUsers
    case 'apis':
      return DashboardApis
    case 'calls':
      return DashboardCalls
    case 'links':
      return DashboardLinks
    case 'fab':
      return DashboardFab
    default:
      return DashboardUsers
  }
})
</script>

<template>
  <div class="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
    <DashboardSidebar :menu-items="menuItems" v-model="activeTab" />
    <div class="flex flex-col">
      <DashboardHeader :menu-items="menuItems" v-model="activeTab" />
      <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
        <component :is="currentComponent" />
      </main>
    </div>
  </div>
</template>
