<script lang="ts" setup>
import { ref, computed } from 'vue'
import DashboardSidebar from '~/components/dashboard/DashboardSidebar.vue'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import DashboardApiKeys from '~/components/user/DashboardApiKeys.vue'

definePageMeta({ middleware: 'auth-user' })

const menuItems = [
  {
    key: 'apikeys',
    title: '我的 API Key',
    icon: 'mdi:key-outline',
  },
]

const activeTab = ref('apikeys')

const currentComponent = computed(() => {
  switch (activeTab.value) {
    case 'apikeys':
      return DashboardApiKeys
    default:
      return DashboardApiKeys
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
