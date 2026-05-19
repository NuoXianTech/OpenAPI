<script setup lang="ts">
import ContentAnnouncementSection from '~/components/admin/sections/ContentAnnouncementSection.vue'
import ContentNotificationSection from '~/components/admin/sections/ContentNotificationSection.vue'
import ContentFriendLinkSection from '~/components/admin/sections/ContentFriendLinkSection.vue'

useHead({ title: '内容管理' })

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const route = useRoute()
const router = useRouter()

const tabs = [
  { value: 'announcements', label: '公告', icon: 'i-mdi-bullhorn-outline' },
  { value: 'notifications', label: '通知', icon: 'i-mdi-bell-outline' },
  { value: 'friend-links', label: '友情链接', icon: 'i-mdi-link-variant' }
]
const active = ref(tabs[0]!.value)

onMounted(() => {
  const h = route.hash.replace('#', '')
  if (tabs.some(t => t.value === h)) active.value = h
})

watch(active, (v) => {
  router.replace({ hash: '#' + v })
})
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
