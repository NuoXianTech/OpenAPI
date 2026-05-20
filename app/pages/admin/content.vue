<script setup lang="ts">
import ContentAnnouncementSection from '~/components/admin/sections/ContentAnnouncementSection.vue'
import ContentNotificationSection from '~/components/admin/sections/ContentNotificationSection.vue'
import ContentFriendLinkSection from '~/components/admin/sections/ContentFriendLinkSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'

useHead({ title: '内容管理' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const tabs = [
  { value: 'announcements', label: '公告', icon: 'i-mdi-bullhorn-outline' },
  { value: 'notifications', label: '通知', icon: 'i-mdi-bell-outline' },
  { value: 'friend-links', label: '友情链接', icon: 'i-mdi-link-variant' }
]
const active = useTabHashSync({ tabs })
</script>

<template>
  <UDashboardPanel id="admin-content">
    <template #header>
      <UDashboardNavbar title="内容管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
      <div class="px-4 pt-3 border-b border-default">
        <UTabs
          v-model="active"
          :items="tabs"
          :content="false"
          variant="link"
        />
      </div>
    </template>

    <template #body>
      <ContentAnnouncementSection v-if="active === 'announcements'" />
      <ContentNotificationSection v-else-if="active === 'notifications'" />
      <ContentFriendLinkSection v-else-if="active === 'friend-links'" />
    </template>
  </UDashboardPanel>
</template>
