# OpenAPI

<p>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v24.13.0-28CF8D?labelColor=18181B" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-v10.15.0-28CF8D?labelColor=18181B" alt="Version"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt%20Docs-18181B?logo=nuxt" alt="Nuxt"></a>
</p>

一个基于 Nuxt.js 构建的全栈式 API 公共接口服务平台，前端使用 shadcn-ui 组件体系与 Tailwind CSS v4 原子化样式框架，提供完整的 API 管理、调用监控、版本控制和 API Key 认证系统，帮助开发者快速构建和管理 API 服务。

## 🌟 项目亮点

- 全栈 Nuxt.js 开发​ - 前后端一体化，高效开发体验
- 灵活的API密钥管理​ - 多维度权限控制和调用限制
- 实时统计与分析​ - 深度洞察 API 接口使用情况

## 🚀 核心功能

- 接口发布与管理​ - 可视化界面快速发布和管理 API
- 多层级密钥管理​ - 支持个人、团队、项目级别的 API Key
- 安全审计日志​ - 记录所有密钥使用情况，确保安全
- 语义化版本控制​ - 遵循标准的版本命名规范
- RESTful Web API 设计​ - 遵循 RESTful API 设计原则

## 🏗️ 技术架构

前端技术栈

- Nuxt.js​ - 现代化全栈框架
- shadcn-ui（Nuxt 场景为 shadcn-vue + shadcn-nuxt）- 统一的可组合 UI 组件体系
- Tailwind CSS v4​ - 原子化样式框架
- Vite​ - 极速构建工具
- Iconify​ - 丰富的图标库

后端技术栈

- Node.js + Nuxt Server API​ - 服务端渲染和 API 处理
- PostgreSQL​ - 主数据库，存储结构化数据
- Redis​ - 缓存、会话和限流管理

## 📦 快速开始

环境要求

- Node.js 24.13.0 或更高版本
- PostgreSQL 16+ 数据库

安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI

# 2. 安装依赖
pnpm install

# 3. 生成数据库迁移文件
pnpm run db:generate

# 4. 运行数据库迁移
pnpm run db:migrate

# 5. 启动开发服务器
pnpm run dev
```

## 🧪 Nuxt 4 测试流程（Vitest + Nuxt Test Utils）

项目已按 Nuxt 官方推荐的 `Vitest + @nuxt/test-utils` 方式接入 e2e 接口测试。

执行全部 e2e 测试：

```bash
pnpm run test:e2e
```

按模块执行：

```bash
# API 接口（增加/删除）
pnpm run test:e2e:apis

# 友情链接（增加/删除）
pnpm run test:e2e:friend-links

# 用户（增加/删除/封禁/未激活）
pnpm run test:e2e:users

# 调用统计（增加/修改/删除）
pnpm run test:e2e:calls
```

说明：

- 测试入口位于 `tests/e2e/`，通用测试能力（管理员登录、数据工厂、统计清理、统一 setup）在 `tests/e2e/helpers/`。
- 运行前请确保数据库已完成迁移（`pnpm run db:migrate`）。
- 用户相关测试通过数据库种子数据覆盖未激活/封禁/删除场景，不依赖外部邮件服务。
- 如需复用已运行服务（避免本地重复构建），可先启动 Nuxt，再设置 `NUXT_TEST_HOST` 后执行测试：

```bash
# Linux / macOS
NUXT_TEST_HOST=http://localhost:3000 pnpm run test:e2e

# Windows PowerShell
$env:NUXT_TEST_HOST='http://localhost:3000'; pnpm run test:e2e
```

## 🧪 调用统计压测与对账

启动服务后可用以下命令执行压测，并自动输出对账结果（请求总数 vs 日统计增量）：

```bash
pnpm run bench:stats -- --requests 1000 --concurrency 1000 --base-url http://localhost:3000 --endpoint /api/v1/test
```

说明：

- 脚本会对 `api_calls` 与 `api_call_stats` 进行前后快照并计算增量。
- 对账通过条件：请求无网络错误，且 `api_calls` 增量与 `api_call_stats.total_count` 增量均等于请求数。
- 数据库连接默认读取 `DATABASE_URL`，若进程环境未设置会回退读取项目根目录 `.env`。

## 🤝 贡献指南

1. Fork 项目仓库
2. 克隆你的Fork到本地：git clone https://github.com/你的用户名/OpenAPI.git
3. 进入项目目录：cd OpenAPI
4. 创建功能分支：git checkout -b feature/你的功能名称
5. 进行代码修改
6. 代码规范检查：pnpm run lint
7. 生成迁移文件：pnpm run db:generate
8. 测试你的代码：pnpm run dev
9. 提交更改：git commit -m '描述你的修改'
10. 推送到你的Fork仓库：git push origin feature/你的功能名称
11. 在GitHub界面发起Pull Request到原始仓库

## 📄 开源许可

本项目采用 MIT 许可证

## 🙌 致谢

- Nuxt.js - 优秀的全栈框架
- Tailwind CSS - 实用的 CSS 框架
- Iconify - 图标库
