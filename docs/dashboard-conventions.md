# 后台页面规范

适用范围：`app/pages/admin/**` 与 `app/pages/user/**` 下所有页面。两套后台共用同一份 `DashboardLayoutBase`，仅菜单/品牌/快捷动作按角色配置。

## 1. 骨架

每个后台页面 **必须** 遵循以下结构：

```vue
<script setup lang="ts">
definePageMeta({ layout: 'admin' | 'user', middleware: 'auth-admin' | 'auth-user' })
</script>

<template>
  <UDashboardPanel :id="..">
    <template #header>
      <UDashboardNavbar :title :description>
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <!-- 业务专属按钮（如"新建"），放在 HeaderActions 之前 -->
          <DashboardHeaderActions :on-refresh="refresh" :refreshing="isLoading" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="hasFilters">
        <!-- 左：搜索/筛选；右：批量动作（v-if="selectedCount > 0"） -->
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <DashboardPageHeader ... />        <!-- 可选：页面 hero -->
        <DashboardStatGrid>...</DashboardStatGrid> <!-- 可选：KPI -->
        <!-- 主体内容 -->
      </div>
    </template>
  </UDashboardPanel>
</template>
```

## 2. 强制规范

| # | 规范 | 反例 |
| --- | --- | --- |
| 1 | navbar 右侧必须用 `DashboardHeaderActions` | 直接写 `<UButton icon="refresh">` + `<AdminHeaderUser />` |
| 2 | KPI 概览必须用 `DashboardStatGrid` + `DashboardStatCard` | 自己写 `<div class="grid">` + `<UCard>` |
| 3 | 设置卡必须用 `DashboardSettingsSection` | 复制 6 张 `UCard` + header icon |
| 4 | 数据表格必须用 `DashboardDataTable` | 直接放 `<UTable>` 不带分页 / 空状态 |
| 5 | 空状态必须用 `DashboardEmpty` | `<div class="text-center py-12">暂无数据</div>` |
| 6 | 页面 hero 必须用 `DashboardPageHeader` | 自己拼 icon + h1 + p |
| 7 | 菜单 / 快捷动作必须在 `app/constants/dashboard-config.ts` 维护 | 在 layout 里硬编码 |
| 8 | 图标只用 `i-mdi-*` / `i-lucide-*` | 引入其它 iconify 集合 |
| 9 | 颜色只用主题 token（`text-muted`、`bg-elevated`、`color="primary"`…） | `text-green-500`、`dark:bg-gray-900` |
| 10 | 数字字段必须挂 `tabular-nums` | 纯数字让等宽对齐 |
| 11 | 弹窗状态建议走 `useOverlay()`（Nuxt UI v4） | 页面 setup 持 4 个 `v-model:open` |

## 3. 命令面板（Ctrl/⌘+K）

由 `DashboardLayoutBase` 全局挂载，每个角色的导航项 + `quickActions` 已经自动注入。

新增快捷操作：在 `app/constants/dashboard-config.ts` 的 `quickActions` 数组中加一项即可。

```ts
quickActions: [
  { label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline', to: '/admin/redemption-codes' },
]
```

## 4. 主题切换

`DashboardHeaderActions` 内置 `UColorModeButton`，自动联动系统/亮/暗。命令面板也支持按主题切换命令。**不要** 自己实现主题切换逻辑。

## 5. 通知铃铛

`DashboardHeaderActions` 内置 `NotificationBell`，admin/user 两端共用，按 `notificationLink` 配置跳转。**不要** 复制铃铛代码到页面。

## 6. 分页 & 筛选（待统一）

- 现阶段表格用 `DashboardDataTable` 支持 `v-model:page` / `:page-size` / `:total` 自动渲染 `UPagination`
- 下一轮规范化会把 admin 的 list 接口统一改为 `{ items, total }` 并加 `limit/offset` 查询参数
- 筛选条件下一轮将统一通过 `useUrlSearchParams` 写回 URL，刷新可恢复

新加表格请：

1. 用 `DashboardDataTable`
2. 数据若可能很大（>200 行），与后端约定服务端分页，传 `:page` / `:page-size` / `:total`
3. 别再手写"上一页 / 下一页"按钮

## 7. Modal 推荐路径

新页面优先用 [Nuxt UI v4 useOverlay()](https://ui.nuxt.com/docs/composables/use-overlay) 调起业务弹窗，让页面 setup 不持弹窗 state。

```ts
const overlay = useOverlay()
const editModal = overlay.create(AdminUserEditModal)
async function openEdit(user) {
  const result = await editModal.open({ target: user })
  if (result) await refresh()
}
```

老页面（users.vue / apis.vue / wallet.vue / apikeys.vue 等）保留 `v-model:open` 模式可工作，重构计划见 [plan](C:\Users\nuoxian\.claude\plans\nuxt-ui-nuxt-optimized-gadget.md) Phase 3。

## 8. 目录约定

```
app/
├── components/
│   ├── dashboard/        通用骨架（Layout/HeaderActions/StatCard/PageHeader/SettingsSection/Empty/DataTable）
│   ├── admin/            管理员业务弹窗 / 卡片
│   ├── user/             普通用户业务卡片
│   └── common/           跨域共用（NotificationBell、AppHeader …）
├── composables/
│   ├── dashboard/        useDashboardConfig 等
│   ├── admin/  user/    业务页面 hook（注意：子目录走显式 import）
├── constants/
│   └── dashboard-config.ts   admin / user 菜单与快捷动作
├── layouts/
│   ├── admin.vue         瓦壳 → DashboardLayoutBase
│   └── user.vue          瓦壳 → DashboardLayoutBase
└── pages/
    └── admin/  user/...
```

## 9. 后续待办

| 项 | 状态 |
| --- | --- |
| 服务端分页 + URL 同步（admin/users、admin/apis 等长列表） | 待办 |
| useOverlay 全面迁移（admin/users、admin/apis、user/apikeys 等弹窗） | 待办 |
| settings.vue 改为 UTabs 二级切换（基本信息 / 安全 / OAuth / Turnstile / SMTP / 公告） | 可选 |
| breadcrumb（系统 / 站点设置 / SMTP） | 可选 |
