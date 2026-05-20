<script setup lang="ts">
import ContentAnnouncementSection from '~/components/admin/sections/ContentAnnouncementSection.vue'
import ContentNotificationSection from '~/components/admin/sections/ContentNotificationSection.vue'
import ContentFriendLinkSection from '~/components/admin/sections/ContentFriendLinkSection.vue'
import { useTabHashSync } from '~/composables/dashboard/useTabHashSync'
import { adminContentTabs } from '~/constants/admin-sections/content'

useHead({ title: '内容管理' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const active = useTabHashSync({ tabs: adminContentTabs })
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
          :items="adminContentTabs"
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
