# OpenAPI 项目文档

本文档按大型项目的知识域维护：入口页负责导航，分域 `index.md` 负责解释阅读顺序，规范正文只保留单一主题。

## 阅读路径

| 领域 | 入口 | 适合场景 |
| --- | --- | --- |
| API | [API 文档](./api/index.md) | 设计、接入、注册、统计对外公共 API |
| 平台能力 | [平台能力文档](./platform/index.md) | 理解计费、积分与平台级规则 |
| 前端后台 | [前端后台文档](./frontend/index.md) | 编写 admin/user 后台页面与交互 |
| 运维部署 | [运维部署文档](./operations/index.md) | 构建、发布和维护生产服务 |
| 资源文件 | [品牌资源](./assets/brand/) | README、站点图标与品牌展示素材 |

## 目录结构

```text
docs/
├── index.md
├── api/
│   ├── index.md
│   ├── design-style.md
│   ├── public-api-conventions.md
│   ├── public-api-onboarding.md
│   └── call-statistics.md
├── frontend/
│   ├── index.md
│   └── dashboard-pages.md
├── operations/
│   ├── index.md
│   └── vps-deployment.md
├── platform/
│   ├── index.md
│   └── billing-rules.md
└── assets/
    └── brand/
```

## 维护规范

- 目录和文件统一使用小写短横线；目录入口固定为 `index.md`。
- 每份正文只保留一个一级标题，后续标题按层级递进，不跳级。
- Markdown 链接优先使用相对路径；引用仓库源码时保持可点击路径和行号。
- TypeScript / Vue 示例必须体现项目约定：`<script setup lang="ts">`、`interface` 优先、具名函数、避免 `enum`。
- 新增图片资源放入 `assets/<domain>/`，文件名说明用途，不使用无语义编号或 `new`、`final` 等临时命名。
