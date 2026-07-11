# 前端工程标准

本文档整合项目的 Nuxt 4 与 Nuxt UI 4 基线；通用 API 以官方文档为准。

## Nuxt 应用标准

本标准适用于 `app/`、`server/`、`shared/`、`modules/` 与 `scripts/` 下的 Nuxt 4 代码。目标是在保持开发速度的同时，让 SSR、类型、运行时配置和生产发布保持可预测。

### 目录边界

| 目录 | 职责 | 约束 |
| --- | --- | --- |
| `app/pages/` | 文件路由页面 | 页面保持薄，业务状态下沉到 composable 或组件 |
| `app/components/` | Vue 组件 | PascalCase 文件名，按 `admin/`、`user/`、`dashboard/`、`common/` 分域 |
| `app/composables/` | 前端组合式函数 | 使用 `use` 前缀，返回稳定的状态、动作和派生值 |
| `app/utils/` | 前端纯工具 | 使用具名导出，不读取运行时全局状态 |
| `server/api/` | 内部 API | 使用 Nuxt/Nitro event handler，私有接口走鉴权守卫 |
| `server/routes/v{N}/` | 公开 API | 由 manifest 扫描，对外契约遵循 [API 文档](./index.md) |
| `server/services/` | 业务服务层 | 保持事务、权限、审计和跨表规则集中 |
| `shared/` | 前后端共享契约 | 类型、schema、静态配置必须可在客户端安全导入 |
| `modules/` | 本地 Nuxt 模块 | 只放构建期或 Nuxt Kit 集成逻辑 |

不要把服务端密钥、数据库连接或 Node-only 依赖放入 `app/` 或客户端可导入的 `shared/` 文件。

### TypeScript 约定

- Vue 组件统一使用 `<script setup lang="ts">`。
- 结构化数据优先使用 `interface`，需要联合、映射或工具类型时再使用 `type`。
- 导出函数使用具名导出；纯函数使用 `function` 关键字。
- 避免 `enum`，使用对象映射和字面量联合。
- 布尔状态使用 `isLoading`、`hasError`、`canSubmit`、`shouldRefresh` 等可读命名。

```ts
export const apiVisibility = {
  public: 'public',
  private: 'private'
} as const

export interface ApiVisibilityOption {
  label: string
  value: keyof typeof apiVisibility
}

export function isPublicApi(value: string): value is ApiVisibilityOption['value'] {
  return value in apiVisibility
}
```

### 数据获取

| 场景 | 推荐方式 |
| --- | --- |
| SSR 首屏必须展示的数据 | `useFetch` 或 `useAsyncData` |
| 首屏可先渲染壳，再补充的数据 | `useLazyFetch` 或 `useLazyAsyncData` |
| 用户动作触发的请求 | `$fetch` |
| 私有分页列表 | 项目内 `usePrivatePagedList` |
| 可分享筛选状态 | 项目内 `useDashboardListState` 同步 URL |

数据获取必须有默认值或空态，避免模板在 `undefined` 上分支过深。客户端临时状态使用 `ref`，复杂表单或筛选组使用 `reactive`。

私有身份与用户数据是例外：项目 `useAuth()` 不把用户身份序列化进 Nuxt payload，私有页面响应也由 `routeRules` 设置 `Cache-Control: private, no-store`。不要为了首屏便利改用会把身份数据注入 SSR payload 的全局状态；应复用现有私有数据 composable，并保持未登录、加载和失效状态可预测。

### SSR 与水合

Nuxt 官方性能文档强调：水合不一致会影响用户体验和性能指标。项目中遵循：

- 不在 `setup` 顶层直接读取 `window`、`document`、`localStorage`、当前时间、随机数或浏览器尺寸。
- 浏览器专属逻辑放入 `onMounted`、`.client.vue`、`import.meta.client` 分支，或包在 `<ClientOnly>` 中并提供 fallback。
- SSR 首屏文本必须可预测；动态时间优先使用后端时间戳或在客户端挂载后更新。
- 第三方库如果有 DOM 副作用，使用动态导入并延后初始化。

```vue
<script setup lang="ts">
interface BrowserState {
  width: number
}

const browserState = reactive<BrowserState>({ width: 0 })

onMounted(() => {
  browserState.width = window.innerWidth
})
</script>
```

### 运行时配置

生产密钥必须通过 `runtimeConfig` 和 `NUXT_*` 环境变量在运行时注入。不要在 `nuxt.config.ts` 默认值里读取异名 `process.env`，否则会把构建机的值烤进产物。完整变量见 [运行时配置](./operations/runtime-config.md)。

### 性能标准

| 目标 | 做法 |
| --- | --- |
| 首屏轻 | 非关键图表、详情弹窗和大表单使用 `Lazy*` 组件或动态导入 |
| LCP 稳定 | 首屏主内容 SSR 输出，图片使用 WebP 或已压缩格式并声明 `width` / `height` |
| CLS 低 | 卡片、表格、统计块、图片和图表容器提供稳定尺寸 |
| INP 低 | 长列表分页，重计算使用 `computed`、`shallowRef` 或服务端聚合 |
| bundle 可控 | 保留 Nuxt/Vite 默认分包；只有 bundle 分析证明收益时，才用 `vite.build.rollupOptions.output.manualChunks` 固化第三方大依赖分块 |

VueUse 组合式函数优先选择 SSR 友好的用法；涉及浏览器 API 的组合式函数必须确认服务端 fallback 或放入客户端分支。

异步组件需要可见加载状态：

```vue
<template>
  <Suspense>
    <LazyAdminAnalyticsHourlyTrend />
    <template #fallback>
      <USkeleton class="h-64 w-full" />
    </template>
  </Suspense>
</template>
```

### 质量门禁

常规变更运行：

```bash
pnpm typecheck
pnpm lint
pnpm test:run
```

发布前额外运行：

```bash
pnpm build
pnpm preview
```

涉及数据库、公开 API、鉴权、计费或后台统计时，至少补充单元测试或在 PR/变更说明里写清楚人工验证路径。

## Nuxt UI 标准

本标准适用于 OpenAPI 的公开页面、管理后台、用户后台和可复用组件。项目使用 Nuxt UI 4、Reka UI、Tailwind CSS 4、Tailwind Variants 与 `i-mdi-*` 图标体系。

### 组件选择

| 场景 | 优先组件 |
| --- | --- |
| 页面骨架 | `UApp`、`UMain`、项目内 dashboard layout |
| 导航 | `UNavigationMenu`、`UBreadcrumb`、`UTabs` |
| 表单 | `UForm`、`UFormField`、`UInput`、`UTextarea`、`USelect`、`USwitch` |
| 反馈 | `UAlert`、`UToast`、`UModal`、`USlideover`、`UEmpty`、`USkeleton` |
| 数据展示 | `UTable`、项目内 `DashboardDataTable`、`UBadge`、`UTooltip` |
| 覆盖层 | Nuxt UI `useOverlay()`，确认场景用项目内 `useConfirmDialog()` |
| 文档型页面 | `UPage`、`UPageHeader`、`UPageBody`、`UContentToc`、`UContentSurround` |

业务页不要重新实现 Nuxt UI 已经覆盖的可访问交互，例如菜单、弹窗、Tooltip、Tabs、Switch、Slider 和表单错误状态。

### 主题与样式

- 颜色优先使用 Nuxt UI 语义 token：`text-muted`、`text-toned`、`text-highlighted`、`bg-elevated`、`border-default`、`color="primary"`。
- 图标统一使用 `i-mdi-*`，按钮有明确动作时优先图标加 tooltip 或图标加短文本。
- 组件变体优先通过 `app.config.ts` 的 Nuxt UI 主题配置、组件 `ui` prop 或 Tailwind Variants 扩展。
- 页面级布局使用 Tailwind 工具类；复杂重复样式抽成组件或配置，不在多个页面复制。
- 移动端优先，先写默认布局，再用 `sm:`、`md:`、`lg:` 扩展。

### 后台页面

后台页面以安静、高密度、可扫描为原则。新增 admin/user 页面时：

1. 页面骨架先参考 [后台页面规范](./frontend/dashboard-pages.md)。
2. 表格优先使用 `DashboardDataTable`，行操作使用 `DashboardRowActions`。
3. 分组页只负责标题、二级导航和 `<NuxtPage />`。
4. 刷新、通知、主题和账号菜单交给 `DashboardHeaderActions`。
5. 弹窗较独立时使用 `useOverlay()` 创建 `Lazy*Modal`；与父表单强耦合时使用 `v-model:open`。

### 表单与验证

表单 schema 放在 `shared/schemas/**`，前端和服务端复用。组件只处理展示和交互，提交逻辑放在 composable 或页面函数中。

```vue
<script setup lang="ts">
interface ApiKeyFormState {
  name: string
  canReadStats: boolean
}

const formState = reactive<ApiKeyFormState>({
  name: '',
  canReadStats: false
})

function resetForm(): void {
  formState.name = ''
  formState.canReadStats = false
}
</script>

<template>
  <UForm :state="formState" class="space-y-4">
    <UFormField label="名称" name="name">
      <UInput v-model="formState.name" />
    </UFormField>
    <UFormField label="允许查看统计" name="canReadStats">
      <USwitch v-model="formState.canReadStats" />
    </UFormField>
    <UButton type="button" variant="ghost" @click="resetForm">
      重置
    </UButton>
  </UForm>
</template>
```

### 可访问性

- 图标按钮提供 `aria-label` 或 `UTooltip` 文本。
- 弹窗标题、描述和危险动作文案必须明确。
- 表单错误由 `UFormField` 承载，不在输入框旁散落自定义文本。
- 状态颜色必须配合文本或图标，不能只依赖颜色表达。
- 表格中的金额、次数、状态码使用 `tabular-nums` 提高可读性。

### 性能

- 图表、富文本编辑器、复杂筛选器和详情弹窗默认懒加载。
- `Lazy*` 组件放在 `Suspense` 中时提供 `USkeleton` 或 `UProgress` fallback。
- 列表超过单页展示能力时分页；可增长选择器优先 `UInputMenu`、`USelectMenu` 或服务端搜索。
- 图片资源使用 WebP 或已压缩 PNG，并声明尺寸，非首屏图片懒加载。
- 不在循环内创建大对象或匿名复杂配置；表格列配置放到 `computed`、常量或 composable。

### 禁止事项

- 不在业务页硬编码大面积颜色、阴影和圆角来覆盖主题。
- 不复制 Nuxt UI 组件内部可访问逻辑。
- 不把页面说明文字当作 UI 说明书塞进应用界面。
- 不为了局部样式创建全局 CSS，除非它属于主题或跨页面布局基础。

