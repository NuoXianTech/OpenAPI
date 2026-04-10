<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

const modules = [
  {
    key: 'users',
    title: '用户管理',
    description: '查看、编辑、封禁、删除用户，并管理用户 API Key。',
    to: '/admin/users',
    icon: 'mdi:account-cog-outline',
  },
  {
    key: 'apis',
    title: '接口管理',
    description: '管理 API 元数据、启停状态和统计开关。',
    to: '/admin/apis',
    icon: 'mdi:api',
  },
  {
    key: 'links',
    title: '友情链接',
    description: '新增、修改、删除友情链接并调整启用状态。',
    to: '/admin/friend-links',
    icon: 'mdi:link-variant-plus',
  },
  {
    key: 'fab',
    title: 'FAB 菜单',
    description: '管理首页右下角浮动入口和行为类型。',
    to: '/admin/fab-menu',
    icon: 'mdi:gesture-tap-button',
  },
  {
    key: 'calls',
    title: '调用统计',
    description: '查看调用日志、成功率与聚合统计结果。',
    to: '/admin/calls',
    icon: 'mdi:chart-line',
  },
  {
    key: 'user-console',
    title: '用户后台',
    description: '切换到用户视角自助管理 API Key。',
    to: '/user/apikeys',
    icon: 'mdi:key-outline',
  },
  {
    key: 'home',
    title: '返回首页',
    description: '回到公开 API 首页查看前台展示。',
    to: '/',
    icon: 'mdi:home-outline',
  },
]
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(980px, 96vw);"
      >
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 class="auth-title">
              管理员控制台
            </h1>
            <p class="auth-subtitle">
              模块化后台入口，按运营任务分区管理。
            </p>
          </div>
          <Badge
            variant="secondary"
            class="mt-1"
          >
            Admin Workspace
          </Badge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Card
            v-for="item in modules"
            :key="item.key"
            class="border-border/70 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
          >
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between gap-2">
                <CardTitle class="text-base">
                  {{ item.title }}
                </CardTitle>
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                  <Icon
                    :name="item.icon"
                    size="16"
                  />
                </span>
              </div>
              <CardDescription>
                {{ item.description }}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                as-child
                variant="outline"
                class="w-full justify-between"
              >
                <NuxtLink :to="item.to">
                  进入模块
                  <Icon
                    name="mdi:arrow-right"
                    size="16"
                  />
                </NuxtLink>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Admin Modules</h3>
        <p>模块化后台更适合单管理员 + 多用户模型。</p>
        <div class="auth-chip">
          Dashboard · Split Modules
        </div>
      </div>
    </div>
  </div>
</template>
