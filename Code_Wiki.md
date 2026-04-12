# OpenAPI 项目 Code Wiki

## 1. 项目整体概述

**OpenAPI** 是一个基于 Nuxt 4 (Vue 3) 构建的全栈式 API 公共接口服务平台。它提供了完整的 API 管理、调用监控、版本控制和 API Key 认证系统。项目前端采用了现代化的 shadcn-vue 组件体系与 Tailwind CSS v4 原子化样式框架，后端依托 Nuxt 的 Nitro 引擎与 Drizzle ORM 实现了轻量而强大的服务端功能。

### 核心亮点
- **全栈式开发**: 基于 Nuxt 4，前后端同构，并采用了最新的 Nuxt 4 目录结构规范，开发体验更流畅。
- **现代化 UI**: 结合 shadcn-vue 和 Tailwind CSS v4，高度可定制的界面。
- **完善的权限体系**: 基于 Session 和自定义中间件实现用户鉴权，包含管理员和普通用户角色。
- **强大的数据层**: Drizzle ORM 配合 PostgreSQL，提供强类型的数据操作与自动化的数据库迁移。
- **自动化监控**: 提供对每个 API 接口的调用量、成功率、响应延迟及流量监控机制。

---

## 2. 目录结构与模块职责

项目遵循了 **Nuxt 4 的全新目录结构规范**，将前端页面相关的代码收拢到 `app/` 目录中，而后端 Nitro 服务代码保留在 `server/`，使得全栈架构的前后端分层更加清晰。

```text
/workspace
├── app/                  # 前端核心业务代码 (Vue/Nuxt)
│   ├── assets/           # 静态资源与全局样式 (Tailwind CSS)
│   ├── components/       # Vue 组件 (UI组件、业务组件)
│   ├── composables/      # 组合式函数 (状态管理、通用逻辑封装)
│   ├── lib/              # 前端工具库 (如 shadcn 的 utils)
│   ├── middleware/       # 路由中间件 (前端路由守卫，如 auth-admin)
│   └── pages/            # 页面路由定义
├── server/               # 后端核心业务代码 (Nitro)
│   ├── api/              # API 路由控制器 (处理 HTTP 请求与响应)
│   ├── db/               # 数据库相关配置
│   │   ├── migrations/   # Drizzle 迁移文件
│   │   ├── schema/       # 数据库表结构定义模型 (Drizzle Schema)
│   │   └── schema.ts     # Schema 导出聚合文件
│   ├── middleware/       # 服务端中间件 (请求拦截、API 统计打点)
│   ├── service/          # 核心业务逻辑层 (供 api 路由调用)
│   └── utils/            # 服务端工具类 (邮件、校验、密码哈希等)
├── shared/               # 前后端共享目录 (类型定义、常量)
├── tests/                # 测试目录
│   └── e2e/              # Playwright + Vitest 端到端测试
├── nuxt.config.ts        # Nuxt 配置文件
└── package.json          # 依赖清单与运行脚本
```

### 主要模块职责划分

1. **表现层 (app/pages, app/components)**: 负责界面展示与用户交互，通过 `useFetch` 或封装好的 `composables` 访问后端 API。
2. **控制层 (server/api)**: 负责接收前端或第三方请求，进行参数校验与权限检查，随后调用 Service 层完成业务处理。
3. **服务层 (server/service)**: 封装核心业务逻辑，避免 Controller 层臃肿。如用户鉴权、API 调用统计、邮件发送等逻辑都在这里实现。
4. **数据访问层 (server/db)**: 基于 Drizzle ORM 与数据库交互，定义了强类型的 Schema，保证数据安全性与开发体验。

---

## 3. 核心数据库模型 (Schema)

所有模型定义在 `server/db/schema/` 目录下。

- **`users` (用户表)**: 存储用户信息（用户名、邮箱、密码哈希、权限状态）。包含账户激活与封禁状态。
- **`apiLists` (接口列表表)**: 平台提供的 API 服务列表。记录了 API 路径、请求方法、限流规则及状态等信息。
- **`apiKeys` (接口密钥表)**: 用户申请的 API Key，用于接口调用时的身份验证与限流控制。
- **`apiCalls` (接口调用日志表)**: 详细记录每次 API 调用的情况（状态码、延迟、IP、请求/响应大小）。
- **`apiCallStats` (接口调用统计表)**: 以天为维度，汇总每个 API 的调用总数、成功数与失败数，主要用于图表展示。
- **`sessions` (会话表)**: 维护用户或管理员的登录态，自定义 Session 机制。
- **`siteSettings` (网站设置表)**: 管理平台的全局设置，例如 SMTP 配置、网站名称及描述等。

---

## 4. 关键类与函数说明

### 4.1 核心中间件
- **`server/middleware/api-call-stats.ts`**: 
  - **职责**: 自动监听以 `/api/` 开头的路由请求。在请求结束 (`res.once('finish')`) 时，计算请求耗时、状态码、响应体大小，并异步写入 `apiCalls` 和 `apiCallStats`，实现无侵入式的 API 调用监控。
  - **关键机制**: 使用了内存缓存 (TTL: 15s) 来缓存统计目标路由，减少对数据库的频繁查询。

### 4.2 核心服务层 (Services)
- **`apiService.ts`**: 
  - 提供 API 的增删改查逻辑。支持按分类查询，并负责管理 API 的启用/禁用状态。
- **`apiCallService.ts` & `apiCallStatsService.ts`**:
  - `addCallAndUpsertDailyStat()`: 在记录单次 API 调用的同时，使用 `ON CONFLICT` (或事务) 原子化地更新每日汇总表 `apiCallStats` 中的调用计数。
- **`apiKeyService.ts`**:
  - 负责 API Key 的生成、状态切换（激活/停用）以及校验。

### 4.3 前端组合式函数 (Composables)
- **`useAuth.ts`**:
  - 提供全局的用户状态管理（登录、登出、获取当前用户信息），基于 Nuxt 的 `useState` 或原生 `ref` 维护全局 `user` 状态。
- **`useApiList.ts` / `usePublicApiList.ts`**:
  - 封装了针对接口列表的请求逻辑与分页加载机制，供前端页面消费。

---

## 5. 依赖关系与技术栈细节

### 前端依赖
- **Vue 3 & Nuxt 4**: 核心框架 (`nuxt: ^4.4.2`)，采用了 Nuxt 4 的全新 `app/` 目录结构隔离与 `compatibilityDate: '2025-07-15'` 规范，提供更稳定的 SSR/CSR 及文件路由能力。
- **shadcn-vue & reka-ui**: 无头组件与可定制 UI 组件体系。
- **Tailwind CSS v4**: 样式引擎，原子化 CSS 框架。
- **@vee-validate/zod & zod**: 负责前端表单的数据校验，确保与后端的类型验证一致。
- **@unovis/vue**: 用于管理后台的数据可视化图表绘制。
- **@iconify-json/mdi & lucide-vue-next**: 图标库。

### 后端依赖
- **@nuxthub/core**: NuxtHub 集成，提供包括数据库(DB)连接在内的 Serverless 部署能力。
- **drizzle-orm & drizzle-kit**: 核心 ORM 框架，支持代码优先的数据库迁移与类型安全的 SQL 构建。
- **postgres / @electric-sql/pglite**: PostgreSQL 数据库驱动（本地测试或嵌入式 PG）。

### 测试依赖
- **vitest & @nuxt/test-utils**: 核心测试框架与 Nuxt 测试工具链，用于编写 e2e 与集成测试。
- **playwright-core**: 驱动浏览器进行真实的 E2E 交互测试。

---

## 6. 项目运行方式

### 6.1 环境要求
- Node.js: >= v24.13.0
- 包管理器: pnpm
- 数据库: PostgreSQL 16+ (项目也支持通过 pglite 在本地免安装 PG 运行)

### 6.2 初始化与运行
```bash
# 1. 克隆项目
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI

# 2. 安装依赖
pnpm install

# 3. 生成 Drizzle 数据库迁移文件
pnpm run db:generate

# 4. 执行数据库迁移，初始化表结构
pnpm run db:migrate

# 5. 启动开发服务器
pnpm run dev
```
启动成功后，默认访问地址为: `http://localhost:3000`

### 6.3 生产环境构建
```bash
# 编译生产版本
pnpm run build

# 预览生产版本
pnpm run preview
```

### 6.4 运行测试
项目拥有完善的端到端测试覆盖，测试前需确保数据库迁移已完成：
```bash
# 运行所有端到端测试
pnpm run test:e2e

# 运行指定模块测试
pnpm run test:e2e:apis         # 测试 API 接口管理功能
pnpm run test:e2e:users        # 测试用户管理模块
pnpm run test:e2e:calls        # 测试统计监控功能
```

## 7. 官方开发参考文档

在进行项目二次开发或贡献代码时，可以参考以下核心技术栈的官方文档：

- **Nuxt 4 官方文档**: 框架核心指南与 API 参考
  [https://nuxt.com/docs/4.x/getting-started/introduction](https://nuxt.com/docs/4.x/getting-started/introduction)
- **NuxtHub 官方文档**: 了解数据库、缓存与 Serverless 部署能力
  [https://hub.nuxt.com/docs/getting-started](https://hub.nuxt.com/docs/getting-started)
- **shadcn-vue 官方文档**: 组件库用法与可定制化 UI 体系
  [https://www.shadcn-vue.com/docs/introduction](https://www.shadcn-vue.com/docs/introduction)

---
*文档生成于：2026年4月12日*
