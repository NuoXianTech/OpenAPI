# 后台页面规范

适用范围：`app/pages/admin/**` 与 `app/pages/user/**` 下所有页面。两套后台共用同一份 `DashboardLayoutBase`，仅菜单/品牌/快捷动作按角色配置。

## 1. 骨架

每个后台页面 **必须** 遵循以下结构：

```vue
<script setup lang="ts">
interface DashboardPageCopy {
  title: string
  description: string
}

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const pageCopy: DashboardPageCopy = {
  title: '用户管理',
  description: '管理用户状态、余额和登录信息'
}
const hasFilters = ref(true)
const isLoading = ref(false)

async function refresh(): Promise<void> {
  isLoading.value = true
  try {
    // 拉取页面数据
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar :title="pageCopy.title" :description="pageCopy.description">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
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
        <UPageHeader :title="pageCopy.title" :description="pageCopy.description" />
        <UPageGrid class="sm:grid-cols-2 lg:grid-cols-4">
          <UPageCard title="128" description="用户总数" variant="subtle" class="[&_h3]:tabular-nums" />
        </UPageGrid>
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
| 2 | KPI 概览必须用 `UPageGrid` + `UPageCard`（`title=value` / `description=label` / `variant="subtle"` / `class="[&_h3]:tabular-nums"`） | 自己写 `<div class="grid">` + `<UCard>` |
| 3 | 设置卡必须用 `UPageCard`（icon + title 在 header，content 在默认 slot，按钮组在 `#footer`） | 复制 6 张 `UCard` + header icon |
| 4 | 数据表格必须用 `DashboardDataTable` | 直接放 `<UTable>` 不带分页 / 空状态 |
| 5 | 空状态必须用 `UEmpty` | `<div class="text-center py-12">暂无数据</div>` |
| 6 | 页面 hero 必须用 `UPageHeader`（icon 可放在 `#title` slot 里） | 自己拼 icon + h1 + p |
| 7 | 菜单 / 快捷动作必须在 `app/constants/dashboard-config.ts` 维护 | 在 layout 里硬编码 |
| 8 | 图标只用 `i-mdi-*` | 引入其它 iconify 集合 |
| 9 | 颜色只用主题 token（`text-muted`、`bg-elevated`、`color="primary"`…） | `text-green-500`、`dark:bg-gray-900` |
| 10 | 数字字段必须挂 `tabular-nums` | 纯数字让等宽对齐 |
| 11 | 弹窗状态建议走 `useOverlay()`（Nuxt UI v4） | 页面 setup 持 4 个 `v-model:open` |

## 3. 命令面板（Ctrl/⌘+K）

由 `DashboardLayoutBase` 全局挂载，每个角色的导航项 + `quickActions` 已经自动注入。

新增快捷操作：在 `app/constants/dashboard-config.ts` 的 `quickActions` 数组中加一项即可。

```ts
interface DashboardQuickAction {
  label: string
  icon: string
  to: string
}

export const quickActions: DashboardQuickAction[] = [
  { label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline', to: '/admin/redemption-codes' }
]
```

## 4. 主题切换

`DashboardHeaderActions` 内置 `UColorModeButton`，自动联动系统/亮/暗。命令面板也支持按主题切换命令。**不要** 自己实现主题切换逻辑。

## 5. 通知铃铛

`CommonNotificationBell`（站内信收件箱）是 **user 专属**——admin 走 env、无 `users` 表记录也无收件箱。它**不进**共用的 `DashboardHeaderActions`，而由 `UserHeaderActions`（= `DashboardHeaderActions` + 铃铛塞进其 `<slot />`）注入：user 页面 navbar 用 `UserHeaderActions`，admin 页面用裸 `DashboardHeaderActions`（slot 为空，无铃铛、无角色判断）。点击从右侧滑出 Slideover 通知中心（无独立页面）。**不要** 复制铃铛代码到页面。

## 6. 分页 & 筛选

- 现阶段表格用 `DashboardDataTable` 支持 `v-model:page` / `:page-size` / `:total` 自动渲染 `UPagination`
- 私有长列表优先用 `usePrivatePagedList` 请求 `{ items, total }` 风格接口，并通过 `limit/offset` 查询参数分页
- 需要刷新恢复 / 分享查询条件的长列表，优先用 `useDashboardListState` 同步稳定筛选项到 URL

新加表格请：

1. 用 `DashboardDataTable`
2. 数据若可能很大（>200 行），与后端约定服务端分页，传 `:page` / `:page-size` / `:total`
3. 别再手写"上一页 / 下一页"按钮

### 6.1 列表状态与 URL 同步

长列表页优先使用 `useDashboardListState` 管理 `filters` / `page` / `pageSize`。私有数据列表继续使用 `usePrivatePagedList` 拉取，确保响应不进入 Nuxt SSR payload。

适合写入 URL 的状态：

- 调用日志等排查型页面的筛选条件
- 当前页与每页条数
- 简短、稳定、可分享的查询值

不适合写入 URL 的状态：

- 弹窗开关
- 行选择
- 临时输入但尚未点击“查询”的内容
- API Key 明文或其它敏感内容

## 7. Modal 推荐路径

新页面优先用 [Nuxt UI v4 useOverlay()](https://ui.nuxt.com/docs/composables/use-overlay) 调起业务弹窗，让页面 setup 不持弹窗 state。

```ts
interface UserEditTarget {
  id: number
  email: string
}

const overlay = useOverlay()
const editModal = overlay.create(AdminUserEditModal)

async function openEdit(target: UserEditTarget): Promise<void> {
  const result = await editModal.open({ target })
  if (result) await refresh()
}
```

### 7.1 删除/确认对话框：`useConfirmDialog()`

所有"二次确认 + 执行动作"场景统一走 `useConfirmDialog`，弹窗内部托管 loading，调用方只需提供动作和错误 toast。

```ts
interface ApiCategoryListItem {
  id: number
  name: string
}

const confirm = useConfirmDialog()
const toast = useToast()

async function openDelete(item: ApiCategoryListItem): Promise<void> {
  await confirm({
    title: `删除分类: ${item.name}`,
    description: '删除后该分类不再可选...',
    // 默认 confirmLabel='删除' / confirmColor='error'，按需覆盖
    async onConfirm() {
      try {
        await $fetch('/api/admin/api-categories/delete', {
          method: 'POST',
          body: { id: item.id }
        })
        toast.add({ title: '已删除', color: 'success' })
        await refresh()
      }
      catch (error) {
        toast.add({ title: parseFetchError(error, '删除失败'), color: 'error' })
        throw error // 抛出 → 弹窗保持打开供用户重试
      }
    }
  })
}
```

实现：[useConfirmDialog](../../app/composables/use-confirm-dialog.ts) + [AppConfirmDialog.vue](../../app/components/common/AppConfirmDialog.vue)。原 `AdminDeleteModal` 已下线。

### 7.2 何时不用 useOverlay

弹窗内容与父组件 reactive state 高度耦合（如表单 props 跟随父组件 `selected` 实时变化），用 useOverlay 反而要走 `modal.patch()` 同步，不如继续 `v-model:open`。

> [!IMPORTANT]
> useOverlay 弹窗挂在 `UApp` 之外，**拿不到页面级 `provide()`**。需要 inject 的值必须在 `overlay.create()` 时通过 `props` 显式传入。

老页面（users.vue / apis.vue / wallet.vue 等）剩余的 `v-model:open` 用法可工作，遵循"改 modal 时顺手改造"原则渐进迁移。

## 8. 目录约定

```
app/
├── components/
│   ├── dashboard/        通用骨架（Layout/HeaderActions/DataTable）
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
