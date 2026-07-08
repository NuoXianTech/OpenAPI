# Nuxt UI 标准

本标准适用于 OpenAPI 的公开页面、管理后台、用户后台和可复用组件。项目使用 Nuxt UI 4、Reka UI、Tailwind CSS 4、Tailwind Variants 与 `i-mdi-*` 图标体系。

## 组件选择

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

## 主题与样式

- 颜色优先使用 Nuxt UI 语义 token：`text-muted`、`text-toned`、`text-highlighted`、`bg-elevated`、`border-default`、`color="primary"`。
- 图标统一使用 `i-mdi-*`，按钮有明确动作时优先图标加 tooltip 或图标加短文本。
- 组件变体优先通过 `app.config.ts` 的 Nuxt UI 主题配置、组件 `ui` prop 或 Tailwind Variants 扩展。
- 页面级布局使用 Tailwind 工具类；复杂重复样式抽成组件或配置，不在多个页面复制。
- 移动端优先，先写默认布局，再用 `sm:`、`md:`、`lg:` 扩展。

## 后台页面

后台页面以安静、高密度、可扫描为原则。新增 admin/user 页面时：

1. 页面骨架先参考 [后台页面规范](../frontend/dashboard-pages.md)。
2. 表格优先使用 `DashboardDataTable`，行操作使用 `DashboardRowActions`。
3. 分组页只负责标题、二级导航和 `<NuxtPage />`。
4. 刷新、通知、主题和账号菜单交给 `DashboardHeaderActions`。
5. 弹窗较独立时使用 `useOverlay()` 创建 `Lazy*Modal`；与父表单强耦合时使用 `v-model:open`。

## 表单与验证

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

## 可访问性

- 图标按钮提供 `aria-label` 或 `UTooltip` 文本。
- 弹窗标题、描述和危险动作文案必须明确。
- 表单错误由 `UFormField` 承载，不在输入框旁散落自定义文本。
- 状态颜色必须配合文本或图标，不能只依赖颜色表达。
- 表格中的金额、次数、状态码使用 `tabular-nums` 提高可读性。

## 性能

- 图表、富文本编辑器、复杂筛选器和详情弹窗默认懒加载。
- `Lazy*` 组件放在 `Suspense` 中时提供 `USkeleton` 或 `UProgress` fallback。
- 列表超过单页展示能力时分页；可增长选择器优先 `UInputMenu`、`USelectMenu` 或服务端搜索。
- 图片资源使用 WebP 或已压缩 PNG，并声明尺寸，非首屏图片懒加载。
- 不在循环内创建大对象或匿名复杂配置；表格列配置放到 `computed`、常量或 composable。

## 禁止事项

- 不在业务页硬编码大面积颜色、阴影和圆角来覆盖主题。
- 不复制 Nuxt UI 组件内部可访问逻辑。
- 不把页面说明文字当作 UI 说明书塞进应用界面。
- 不为了局部样式创建全局 CSS，除非它属于主题或跨页面布局基础。
