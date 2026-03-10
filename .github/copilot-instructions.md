## Copilot 使用说明（工作区级）

目的
- 为交互式 AI 助手（Copilot Chat / agents）提供快速上手的工程级说明，包含构建/运行命令、约定、关键目录与常见任务指南。

工作流概览
1. 发现约定：优先检查本文件和根 README.md 获取环境与运行命令。
2. 探索代码：定位前端（`app/`）、后端接口（`server/api/`）、数据库模式与迁移（`db/`）。
3. 生成或合并：对需要新增的说明采用最小变更，保持已有文档内容并补充缺失信息。
4. 迭代：提出示例交互提示并建议进一步的 agent 自定义（如针对后端、前端、数据库的 applyTo 规则）。

关键命令（在仓库根目录执行）
- 安装依赖：`pnpm install`
- 启动开发服务：`pnpm run dev`（内部调用 `nuxt dev`）
- 生产构建：`pnpm run build`（`nuxt build`）
- 预览构建：`pnpm run preview`（`nuxt preview`）
- 生成 DB 迁移/文件：`pnpm run db:generate`
- 代码风格检查：`pnpm run lint`，自动修复：`pnpm run lint:fix`

环境与约束
- Node.js: 建议使用 Node.js 24.x（README 中列出 24.13.0 及以上）。
- 包管理器：`pnpm`（仓库使用 pnpm-lock.yaml）。
- 数据库：PostgreSQL 16+（用于本地/CI），项目在 `db/` 下包含模式与迁移。

重要目录（快速导航）
- 前端（Nuxt）应用：`app/`（页面、组件、assets、composables）
- 服务端 API：`server/api/`（按路由组织的 server handlers，例如 `server/api/v1/`）
- 数据库模式与迁移：`db/schema.ts`、`db/migrations/`、`db/schema/`（包含 `apiKeys.ts`、`apiLists.ts` 等）
- 后端服务实现：`server/service/`（`apiService.ts`、`userService.ts`）
- 工具与脚本：`utils/`（如 `report.ts`）

开发建议
- 本地开发流程：安装依赖 → 生成 DB 文件（`db:generate`）→ 启动开发（`pnpm run dev`）。
- 变更数据库模式时，使用 `pnpm run db:generate` 生成或更新迁移/DDL。
- 提交前运行 `pnpm run lint` 并在需要时 `pnpm run lint:fix`。

Agent/助理使用示例提示（示例）
- "如何在本地运行并连接到 PostgreSQL？列出必须的环境变量与示例 .env 配置。"
- "在 `server/api/v1/` 中添加一个新路由，路径 `/v1/health`，实现一个简单的健康检查返回 JSON。给出实现代码和测试步骤。"
- "解析 `db/schema/apiLists.ts`，说明 `apiLists` 模型的字段及约束，并生成一个 SQL 创建表语句草案。"

建议的后续自定义（可选）
- 创建针对 `server/` 的 applyTo 规则：仅当改动涉及 `server/**` 时启用数据库/迁移相关提示与检查。
- 为前端 `app/` 区域创建一个专用 agent，包含 UI 组件命名约定与样式系统（Tailwind + Nuxt UI）说明。

维护说明
- 当项目主要构建、脚本名或关键目录发生变更时，请同步更新本文件。
