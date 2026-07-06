# Nuxt 应用标准

本标准适用于 `app/`、`server/`、`shared/`、`modules/` 与 `scripts/` 下的 Nuxt 4 代码。目标是在保持开发速度的同时，让 SSR、类型、运行时配置和生产发布保持可预测。

## 目录边界

| 目录 | 职责 | 约束 |
| --- | --- | --- |
| `app/pages/` | 文件路由页面 | 页面保持薄，业务状态下沉到 composable 或组件 |
| `app/components/` | Vue 组件 | PascalCase 文件名，按 `admin/`、`user/`、`dashboard/`、`common/` 分域 |
| `app/composables/` | 前端组合式函数 | 使用 `use` 前缀，返回稳定的状态、动作和派生值 |
| `app/utils/` | 前端纯工具 | 使用具名导出，不读取运行时全局状态 |
| `server/api/` | 内部 API | 使用 Nuxt/Nitro event handler，私有接口走鉴权守卫 |
| `server/routes/v{N}/` | 公开 API | 由 manifest 扫描，对外契约遵循 [API 文档](../api/index.md) |
| `server/services/` | 业务服务层 | 保持事务、权限、审计和跨表规则集中 |
| `shared/` | 前后端共享契约 | 类型、schema、静态配置必须可在客户端安全导入 |
| `modules/` | 本地 Nuxt 模块 | 只放构建期或 Nuxt Kit 集成逻辑 |

不要把服务端密钥、数据库连接或 Node-only 依赖放入 `app/` 或客户端可导入的 `shared/` 文件。

## TypeScript 约定

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

## 数据获取

| 场景 | 推荐方式 |
| --- | --- |
| SSR 首屏必须展示的数据 | `useFetch` 或 `useAsyncData` |
| 首屏可先渲染壳，再补充的数据 | `useLazyFetch` 或 `useLazyAsyncData` |
| 用户动作触发的请求 | `$fetch` |
| 私有分页列表 | 项目内 `usePrivatePagedList` |
| 可分享筛选状态 | 项目内 `useDashboardListState` 同步 URL |

数据获取必须有默认值或空态，避免模板在 `undefined` 上分支过深。客户端临时状态使用 `ref`，复杂表单或筛选组使用 `reactive`。

## SSR 与水合

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

## 运行时配置

生产密钥必须通过 `runtimeConfig` 和 `NUXT_*` 环境变量在运行时注入。不要在 `nuxt.config.ts` 默认值里读取异名 `process.env`，否则会把构建机的值烤进产物。完整变量见 [运行时配置](../operations/runtime-config.md)。

## 性能标准

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

## 质量门禁

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
