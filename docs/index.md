# OpenAPI 项目文档

本文档按生产项目的知识域维护：入口页负责导航，分域 `index.md` 负责阅读顺序，正文只承载单一主题。目标是让新成员能快速定位，让发布人员能照单执行，让长期维护者能看见边界。

## 快速入口

| 角色 | 先读 | 再读 |
| --- | --- | --- |
| 新增公开 API | [公共接口接入指南](./api/public-api-onboarding.md) | [对外接口落地规范](./api/public-api-conventions.md)、[API 计费规则](./platform/billing-rules.md) |
| 编写后台页面 | [后台页面规范](./frontend/dashboard-pages.md) | [Nuxt 应用标准](./standards/nuxt-application.md)、[Nuxt UI 标准](./standards/nuxt-ui.md) |
| 准备生产发布 | [生产就绪清单](./operations/production-readiness.md) | [运行时配置](./operations/runtime-config.md)、[VPS 部署指南](./operations/vps-deployment.md) |
| 处理生产异常 | [生产运行手册](./operations/production-runbook.md) | [生产就绪清单](./operations/production-readiness.md)、[API 调用统计规范](./api/call-statistics.md) |
| 审查架构一致性 | [工程标准](./standards/index.md) | [平台能力文档](./platform/index.md)、[API 文档](./api/index.md) |

## 当前架构摘要

- 默认生产部署为单个 Node/Nitro 进程；使用 PostgreSQL、共享 Redis 和强制 Redis 模式后，可安全协调多实例限流、缓存、启动同步与扣费补偿任务。
- 管理员和普通用户共用 `users` 表，通过 `users.role` 区分权限，并统一从 `/login` 登录。
- 首次启动如果不存在管理员，服务端会创建 `admin <admin@openapi.com>`，随机密码只输出到控制台；首次登录后通过一次性初始化弹窗确认用户名、邮箱并设置新密码。
- 管理员继承用户侧常规能力，同时拥有管理侧能力；普通用户只访问用户工作区。
- 公共 API 由 `server/routes/v{N}/{code}/` 文件路由发现，启动时同步到数据库后由管理员启用和配置。

## 文档地图

| 领域 | 入口 | 适合场景 |
| --- | --- | --- |
| 工程标准 | [工程标准](./standards/index.md) | 统一 Nuxt、Nuxt UI、TypeScript、性能与文档写法 |
| API | [API 文档](./api/index.md) | 设计、接入、注册、统计对外公共 API |
| 平台能力 | [平台能力文档](./platform/index.md) | 理解计费、积分与平台级规则 |
| 前端后台 | [前端后台文档](./frontend/index.md) | 编写 admin/user 后台页面与交互 |
| 运维部署 | [运维部署文档](./operations/index.md) | 构建、发布和维护生产服务 |
| 资源文件 | [品牌资源](./assets/brand/) | README、站点图标与品牌展示素材 |

## 生产门禁

任何进入生产的变更至少满足：

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

涉及公开 API、鉴权、计费、数据库迁移或部署脚本时，还要按 [生产就绪清单](./operations/production-readiness.md) 完成运行时配置、迁移、回滚、健康检查和关键页面冒烟验证。

## 目录结构

```text
docs/
├── index.md
├── standards/
│   ├── index.md
│   ├── documentation.md
│   ├── nuxt-application.md
│   └── nuxt-ui.md
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
│   ├── production-runbook.md
│   ├── production-readiness.md
│   ├── runtime-config.md
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
- 生产步骤要写成可复制命令；密钥只写生成方式、变量名和风险，不写真实值。
- 新增图片资源放入 `assets/<domain>/`，文件名说明用途，不使用无语义编号或 `new`、`final` 等临时命名。
