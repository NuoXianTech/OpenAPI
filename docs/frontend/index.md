# 前端后台文档

本目录维护 admin/user 后台页面的结构、组件选型和交互规范。所有后台页面应优先复用 Nuxt UI、Vue Composition API、VueUse 和项目内已有 dashboard 组件。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| [后台页面规范](./dashboard-pages.md) | admin/user 页面骨架、HeaderActions、表格、弹窗、筛选与目录约定 |
| [Nuxt UI 标准](../standards/nuxt-ui.md) | Nuxt UI、Reka UI、Tailwind token、可访问性和性能约束 |
| [Nuxt 应用标准](../standards/nuxt-application.md) | SSR、水合、数据获取、TypeScript 和质量门禁 |

## 维护边界

- 页面示例必须使用 `<script setup lang="ts">`。
- 组件与组合式函数示例必须具备明确接口，避免隐式 `any`。
- UI 规范只描述后台应用内体验，不承载公开 API 或部署约束。
- 页面提交前按 [生产就绪清单](../operations/production-readiness.md) 的前端相关项检查首屏、空态、错误态和响应式布局。
