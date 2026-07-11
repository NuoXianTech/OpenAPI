# 后台页面规范

适用范围：`app/pages/admin/**` 与 `app/pages/user/**` 下的后台页面。两套后台共用 `dashboard` layout 与 `DashboardLayoutBase`，差异通过 `app/constants/dashboard-config.ts`、`app/constants/dashboard-sections.ts` 与 `DashboardHeaderActions` 收敛。管理员也是 `users.role='admin'` 的用户账号，因此管理后台同时展示用户常规能力和管理能力；普通用户只展示用户常规能力。

## 1. 页面骨架

后台页面分两类：

| 类型 | 用法 | 现有样板 |
| --- | --- | --- |
| 分组父级页 | 用 `DashboardSectionShell` 渲染二级导航，并通过内部 `<NuxtPage />` 承载子页 | `app/pages/admin/(dashboard)/apis.vue`、`app/pages/user/(dashboard)/settings.vue` |
| 业务叶子页 | 用 `UDashboardPanel` + `UDashboardNavbar` + `dashboard-section-page` 承载具体内容 | `app/pages/admin/(dashboard)/logs.vue`、`app/pages/user/(dashboard)/apikeys.vue` |

当前侧边栏结构：

| 工作区 | 分组 | 页面 |
| --- | --- | --- |
| 用户 | 常规 | 概览、API 密钥、使用日志 |
| 用户 | 个人 | 积分、设置 |
| 管理员 | 常规 / 个人 | 继承用户工作区能力 |
| 管理员 | 管理 | 概览、数据看板、日志中心 |
| 管理员 | 运营 | 兑换码、内容管理 |
| 管理员 | 系统 | 接口管理、用户管理、系统设置 |

日志中心统一挂在 `/admin/logs` 下：调用日志 `/admin/logs`、登录日志 `/admin/logs/login`、积分日志 `/admin/logs/credits`、操作日志 `/admin/logs/operations`。用户积分页保留二级 tab：概览、签到兑换、流水明细。

分组父级页保持薄，只负责标题、二级导航和右上角动作：

```vue
<script setup lang="ts">
import { adminApisSection } from '~/constants/dashboard-sections'
</script>

<template>
  <DashboardSectionShell v-bind="adminApisSection" />
</template>
```

`app/pages/admin/(dashboard).vue` 与 `app/pages/user/(dashboard).vue` 统一声明：

```ts
definePageMeta({
  layout: {
    name: 'dashboard',
    props: {
      dashboardId: 'admin'
    }
  },
  middleware: 'auth-dashboard'
})
```

子页面不要重复声明 layout / middleware，直接声明面板。右上角动作统一使用 `DashboardHeaderActions`：

```vue
<script setup lang="ts">
const { data, status, refresh } = useLazyFetch('/api/user/apikeys/list', {
  default: () => []
})
</script>

<template>
  <UDashboardPanel id="user-apikeys">
    <template #header>
      <UDashboardNavbar
        title="API Key"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <!-- 主体内容 -->
      </div>
    </template>
  </UDashboardPanel>
</template>
```

## 2. 组件约定

| 场景 | 优先使用 |
| --- | --- |
| 后台整体布局 | `app/layouts/dashboard.vue` + `DashboardLayoutBase` |
| 分组页二级导航 | `DashboardSectionShell` |
| 右上角刷新、通知、主题、账号菜单 | `DashboardHeaderActions` |
| 通知铃铛 | `DashboardHeaderActions` 内置 `CommonNotificationBell`，不要在页面里复制通知组件 |
| 表格 | `DashboardDataTable` |
| 行操作菜单 | `DashboardRowActions` |
| 列显隐 | `DashboardColumnVisibility` |
| 统计小图 | `DashboardSparkline` |
| 空状态 | `DashboardDataTable` 内置 `UEmpty`，非表格场景直接用 `UEmpty` |

后台 UI 以 Nuxt UI 组件和主题 token 为主。图标统一使用 `i-mdi-*`；颜色优先使用 `text-muted`、`bg-elevated`、`color="primary"` 这类主题语义，不在业务页散落硬编码色值。

## 3. 数据与分页

小型列表可以一次性拉取，再用 `useClientPagination` 做客户端分页。可能增长的私有长列表优先使用 `usePrivatePagedList`，接口返回 `{ items, total }`，前端用 `limit/offset` 查询参数分页。

只有产品明确要求“刷新恢复”或“复制链接复现筛选”时，才使用 `useDashboardListState` 将稳定筛选项同步到 URL。默认列表分页保持组件内状态；例如 `/user/logs` 与 `/user/apikeys` 均不得因切换分页产生 `page` 或 `pageSize` 查询参数。适合按需写入 URL 的状态包括：

- 调用日志、登录日志、积分流水等排查型筛选条件
- 明确需要分享时的当前页和每页条数（默认不写入）
- 简短、稳定、可分享的查询值

不写入 URL 的状态包括：

- 弹窗开关
- 行选择
- 临时输入但尚未提交的搜索词
- API Key 明文或其他敏感内容

## 4. 表格

新表格优先用 `DashboardDataTable`，让空状态、分页、每页条数、行选择、列显隐和默认表格外观保持一致。

```vue
<DashboardDataTable
  v-model:page="page"
  v-model:page-size="pageSize"
  :data="items"
  :columns="columns"
  :loading="loading"
  :total="total"
  :page-size-items="PAGE_SIZE_ITEMS"
  empty-title="暂无日志"
  empty-icon="i-mdi-history"
/>
```

列多或内容较宽的表格传 `:fixed="false"`，避免内容挤压。数字字段显示时加 `tabular-nums`，金额、次数、状态码等字段优先在 cell slot 中统一格式化。

## 5. 弹窗与确认

脱离父组件状态的详情、重置、确认弹窗优先使用 Nuxt UI 的 `useOverlay()`。表单内容与父组件 reactive state 高度耦合时，保留 `v-model:open` 更直接，不强行迁移。

```ts
const overlay = useOverlay()
const detailModal = overlay.create(LazyAdminCallLogDetailModal, { destroyOnClose: true })

function openDetail(row: AdminLogRow) {
  detailModal.open({ row })
}
```

删除、停用、批量操作等二次确认统一走 `useConfirmDialog()`。弹窗内部托管 loading，调用方在失败时抛出错误，弹窗会保持打开以便重试。

```ts
const confirm = useConfirmDialog()
const toast = useToast()

async function openDelete(item: ApiCategoryListItem): Promise<void> {
  await confirm({
    title: `删除分类: ${item.name}`,
    description: '删除后该分类不再可选。',
    async onConfirm() {
      try {
        await $fetch('/api/admin/api-categories/delete', {
          method: 'POST',
          body: { id: item.id }
        })
        toast.add({ title: '已删除', color: 'success' })
        await refresh()
      } catch (error) {
        toast.add({ title: parseFetchError(error, '删除失败'), color: 'error' })
        throw error
      }
    }
  })
}
```

> [!IMPORTANT]
> `useOverlay()` 弹窗挂在页面组件树之外，不能依赖页面级 `provide()`。需要的数据必须通过 `overlay.open()` 的 props 显式传入。

## 6. 通知与头部动作

`DashboardHeaderActions` 内置刷新按钮、通知铃铛、主题切换和账号菜单。通知是账号能力，不是普通用户专属能力；管理员和普通用户都通过统一 HeaderActions 查看通知。页面内不要临时复制 `CommonNotificationBell`。

如果页面支持刷新，把 `refresh` 和加载状态传给 HeaderActions；如果页面没有明确刷新动作，可以省略：

```vue
<DashboardHeaderActions
  :on-refresh="refresh"
  :refreshing="status === 'pending'"
/>
```

## 7. 目录约定

```text
app/
├── components/
│   ├── dashboard/        后台骨架、表格、行操作、列显隐等通用组件
│   ├── admin/            管理员业务弹窗 / 卡片
│   ├── user/             用户业务卡片 / 弹窗
│   └── common/           跨域共用组件
├── composables/
│   ├── dashboard/        后台列表状态、分页、配置注入
│   ├── admin/            管理后台页面组合式函数
│   ├── user/             用户后台页面组合式函数
│   └── api/              API Key 与公开接口相关组合式函数
├── constants/
│   ├── dashboard-sections.ts
│   └── dashboard-config.ts
├── layouts/
│   └── dashboard.vue
└── pages/
    ├── admin/
    └── user/
```

新增页面时先找同域现有样板，优先复用组合式函数和 dashboard 组件；确实出现第三处重复逻辑时再提取新组件或 composable。
