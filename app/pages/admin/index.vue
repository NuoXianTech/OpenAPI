<script lang="ts" setup>
import type { Component } from 'vue'
import AdminApisPanel from '~/components/admin/panels/AdminApisPanel.vue'
import AdminCallsPanel from '~/components/admin/panels/AdminCallsPanel.vue'
import AdminFabMenuPanel from '~/components/admin/panels/AdminFabMenuPanel.vue'
import AdminFriendLinksPanel from '~/components/admin/panels/AdminFriendLinksPanel.vue'
import AdminUsersPanel from '~/components/admin/panels/AdminUsersPanel.vue'
import { useAdminWorkspace } from '~/composables/useAdminWorkspace'

definePageMeta({ middleware: 'auth-admin' })

const workspaceTabs = [
  { value: 'users', label: '用户管理', description: '用户资料、封禁与 API Key 管理' },
  { value: 'apis', label: '接口管理', description: 'API 元数据与状态开关' },
  { value: 'friend-links', label: '友情链接', description: '友情链接配置与启停' },
  { value: 'fab-menu', label: 'FAB 菜单', description: '浮动菜单入口与行为管理' },
  { value: 'calls', label: '调用统计', description: '请求日志与统计视图' },
] as const

type WorkspaceTab = typeof workspaceTabs[number]['value']

const panelMap: Record<WorkspaceTab, Component> = {
  users: AdminUsersPanel,
  apis: AdminApisPanel,
  'friend-links': AdminFriendLinksPanel,
  'fab-menu': AdminFabMenuPanel,
  calls: AdminCallsPanel,
}

const route = useRoute()
const router = useRouter()
const tabValues = workspaceTabs.map(tab => tab.value)
const { activeTab, normalizeTab, restoreTab, setActiveTab } = useAdminWorkspace(tabValues as string[], 'users')

const activePanel = computed(() => {
  return panelMap[activeTab.value as WorkspaceTab] || AdminUsersPanel
})

const toSingleQueryValue = (value: string | null | (string | null)[] | undefined) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined
  }
  return typeof value === 'string' ? value : undefined
}

const replaceRouteTab = async (tab: string) => {
  if (!tab || route.query.tab === tab) {
    return
  }

  await router.replace({
    query: {
      ...route.query,
      tab,
    },
  })
}

watch(
  () => route.query.tab,
  (rawTab) => {
    const fromQuery = normalizeTab(toSingleQueryValue(rawTab))
    if (fromQuery) {
      setActiveTab(fromQuery)
    }
  },
)

onMounted(async () => {
  const queryTab = normalizeTab(toSingleQueryValue(route.query.tab))
  const initial = queryTab ? setActiveTab(queryTab) : restoreTab()
  if (initial) {
    await replaceRouteTab(initial)
  }
})

const onTabChange = async (nextTab: string | number) => {
  const normalized = setActiveTab(String(nextTab))
  if (!normalized) {
    return
  }
  await replaceRouteTab(normalized)
}
</script>

<template>
  <div class="mx-auto grid w-full max-w-[1600px] gap-4 px-3 py-4 md:px-6 md:py-6">
    <Card class="border-border/70 bg-card/90 shadow-sm">
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle class="text-xl">
              管理员工作台
            </CardTitle>
            <CardDescription>
              单页面后台入口，支持模块切换、路由兼容与本地记忆最近 tab。
            </CardDescription>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Admin Workspace
            </Badge>
            <Button
              as-child
              variant="outline"
              size="sm"
            >
              <NuxtLink to="/user/apikeys">
                用户后台
              </NuxtLink>
            </Button>
            <Button
              as-child
              variant="outline"
              size="sm"
            >
              <NuxtLink to="/">
                返回首页
              </NuxtLink>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          :model-value="activeTab"
          class="grid gap-2"
          @update:model-value="onTabChange"
        >
          <ScrollArea class="w-full whitespace-nowrap">
            <TabsList class="inline-flex h-auto w-auto gap-2 rounded-lg bg-muted/40 p-1">
              <TabsTrigger
                v-for="tab in workspaceTabs"
                :key="tab.value"
                :value="tab.value"
                class="flex min-w-[148px] flex-col items-start gap-1 px-3 py-2 text-left"
              >
                <span class="text-sm font-medium leading-none">{{ tab.label }}</span>
                <span class="text-[11px] text-muted-foreground">{{ tab.description }}</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>

    <div class="rounded-xl border border-border/70 bg-background/70 p-3 md:p-4">
      <KeepAlive>
        <component :is="activePanel" />
      </KeepAlive>
    </div>
  </div>
</template>
