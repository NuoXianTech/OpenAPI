## Copilot 使用说明（工作区级）

目的
- 为交互式 AI 助手（Copilot Chat / agents）提供快速上手的工程级说明，包含构建/运行命令、约定、关键目录与常见任务指南。

工作流概览
1. 先读约定：优先检查本文件和根 README.md，确认环境变量、运行命令和数据库流程。
2. 再看代码：优先定位 `app/`、`server/api/`、`server/service/`、`server/db/schema/`。
3. 小步修改：尽量做最小变更，保持现有命名、目录结构和页面风格一致。
4. 联动检查：凡是改了 API、schema 或字段名，都要同步检查服务层、接口路由、前端页面、测试入口和文档。
5. 数据库变更：不要直接修改或新增 `server/db/migrations/` 下的文件，所有数据库结构调整都先在 `server/db/schema/` 中完成，然后使用 `pnpm run db:migrate` 生成并执行迁移。
6. 进一步自定义：需要更细的规则时，再考虑针对后端、前端、数据库分别创建 applyTo 规则。

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
- 数据库模式与迁移：`server/db/schema.ts`、`server/db/schema/`、`server/db/migrations/`（包含 `apiKeys.ts`、`apiLists.ts` 等）
- 后端服务实现：`server/service/`（`apiService.ts`、`userService.ts`）
- 工具与脚本：`utils/`（如 `report.ts`）

开发建议
- 本地开发流程：安装依赖 → 修改 `server/db/schema/` → 执行 `pnpm run db:migrate` → 启动开发（`pnpm run dev`）。
- 变更数据库模式时，只改 `server/db/schema/`，不要手工编辑 `server/db/migrations/`；迁移文件应由 `pnpm run db:migrate` 生成或更新。
- 当修改了环境变量、命令、目录约定或数据库字段时，优先同步更新 README 和相关说明文件。
- 提交前运行 `pnpm run lint` 并在需要时 `pnpm run lint:fix`。

前端页面风格约定（AI 协作）
- 组件体系：优先使用 shadcn-ui（Nuxt 场景为 `shadcn-vue + shadcn-nuxt`）和 `app/components/ui/` 里的基础组件，避免重复造轮子。
- 样式体系：统一使用 Tailwind CSS v4 原子化类名，优先复用已有设计 token（如 `bg-surface`、`border-border`、`text-muted`）。
- 视觉语言：页面保持清爽、卡片化、信息分层明确；常用 `rounded-lg/rounded-xl`、轻边框和轻阴影，避免突兀的重色块与过度动效。
- 布局规范：优先使用响应式网格与弹性布局，桌面端控制内容最大宽度，移动端保证可读性与可点击面积。
- 交互规范：筛选、搜索、统计图表等模块优先复用现有模式与组件命名，新增页面尽量与现有 `dashboard` 风格一致。

Agent/助理使用示例提示（示例）
- "如何在本地运行并连接到 PostgreSQL？列出必须的环境变量与示例 .env 配置。"
- "在 `server/api/v1/` 中添加一个新路由，路径 `/v1/health`，实现一个简单的健康检查返回 JSON。给出实现代码和测试步骤。"
- "解析 `db/schema/apiLists.ts`，说明 `apiLists` 模型的字段及约束，并生成一个 SQL 创建表语句草案。"

建议的后续自定义（可选）
- 创建针对 `server/` 的 applyTo 规则：仅当改动涉及 `server/**` 时启用数据库/迁移相关提示与检查。
- 为前端 `app/` 区域创建一个专用 agent，包含 UI 组件命名约定与样式系统（shadcn-ui + Tailwind CSS v4）说明。

维护说明
- 当项目主要构建、脚本名或关键目录发生变更时，请同步更新本文件。
