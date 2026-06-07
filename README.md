# OpenAPI

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?logo=nuxt)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js)](https://vuejs.org)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A524.15-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenAPI 是一个基于 Nuxt 4 的 API 服务平台，提供 API 密钥鉴权、单进程内存限流、积分计费、调用日志、每日统计、后台审计日志、站内通知、第三方 OAuth 登录与站点设置等能力，开箱即用的全中文界面。

## 生产部署目标

本项目面向**单台 Node 服务进程 + PostgreSQL** 的部署形态。

- Nitro 预设：`node-server`
- 数据库：PostgreSQL 16+
- 限流：进程内存计数器
- 后台任务：由同一个 Node 进程承载启动同步、过期数据回收、扣费补偿重试等定时作业

请勿对同一个生产数据库启动多个 Node 实例。限流窗口被设计为在 Node 进程重启时清零。

## 功能特性

- **构建期接口发现**：`server/routes/v{N}/{code}/` 下的文件即接口，构建期由 `modules/api-manifest` 自动生成接口清单，启动时同步进数据库
- **用户体系**：注册、邮箱验证、登录会话、找回密码、修改邮箱，以及第三方 OAuth 登录
- **API 密钥**：用户自助创建与管理，支持作用域、IP 白名单、配额、有效期与吊销
- **积分计费**：按接口、按方法配置积分单价（`methodCosts`），含每日配额、积分流水与扣费补偿队列重试
- **限流与配额**：秒 / 分 / 时 / 天 四级内存限流，叠加每日配额校验
- **调用日志与统计**：不可变的调用审计日志（`api_calls`）+ 按接口按自然日聚合的统计（`api_call_stats`）
- **兑换码 / 每日签到**：生成兑换码兑换积分、每日签到领取积分，均有完整流水记录
- **站内通知 / 公告 / 友情链接**：内容侧的消息投递与展示管理
- **后台管理**：用户、接口、分类、兑换码、OAuth 提供商、站点设置、公告、友链、通知、操作日志、登录日志，以及数据分析仪表盘
- **安全默认值**：会话 ID 哈希存储、scrypt 密码哈希、AES-256-GCM 加密的 OAuth 密钥、私有页面服务端守卫、图形验证码
- **前端**：Nuxt UI v4 + Tailwind CSS v4

## 技术栈

| 领域 | 主要依赖 |
| --- | --- |
| 前端 | Nuxt 4.4、Vue 3.5、Nuxt UI 4.8、Tailwind CSS 4、@unovis/vue（图表）、@tanstack/vue-table、VueUse、Zod、bowser（设备解析） |
| 服务端 | Nitro（`node-server` 预设）、Drizzle ORM 0.45、drizzle-kit、postgres.js、nodemailer、@nuxthub/core |
| 数据库 | 生产使用 PostgreSQL 16+；开发可使用 pglite |
| 工具链 | TypeScript、ESLint、pnpm |

## 快速开始

### 环境要求

- Node.js >= 24.15
- pnpm 11.x
- PostgreSQL 16+

### 安装

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
pnpm install

cp .env.example .env
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 关键环境变量

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 生产必填 | PostgreSQL 连接串；运行时读取，改后重启即生效 |
| `NUXT_AUTH_ADMIN_USERNAME` / `NUXT_AUTH_ADMIN_PASSWORD` | 必填 | 管理员内置账号凭据（不入库、后台不可改，改后重启即生效） |
| `NUXT_AUTH_ADMIN_EMAIL` | 否 | 管理员展示邮箱 |
| `NUXT_AUTH_EMAIL_VERIFY_SECRET` | 推荐 | 邮箱验证与 OAuth state 的 HMAC 密钥 |
| `NUXT_AUTH_API_KEY_SECRET` | 推荐 | API 密钥相关的服务端密钥 |
| `NUXT_AUTH_JWT_SECRET` | 必填 | access JWT 的 HS256 签名密钥；为空时鉴权 fail-closed |

> 管理员/密钥类变量必须使用 `NUXT_AUTH_` 前缀，运行时才会覆盖（Nuxt 生产环境只认 `NUXT_` 前缀且名字匹配 `runtimeConfig` 结构的环境变量）。所有变量改后重启进程即生效，无需重新构建。

完整的单实例生产配置见 [.env.example](.env.example)。

### 常用命令

```bash
pnpm db:generate   # 修改 schema 后生成 SQL 迁移
pnpm db:migrate    # 应用迁移
pnpm dev           # 启动开发服务器
pnpm build         # 构建生产产物
pnpm preview       # 预览生产构建
pnpm lint          # 运行 ESLint
pnpm lint:fix      # 自动修复 ESLint 问题
pnpm typecheck     # 运行 Nuxt TypeScript 检查
```

## 目录结构

```text
app/                      Nuxt 前端
server/api/               内部 API 路由
server/routes/v{N}/       由清单模块发现的公开 API 路由
server/db/schema/         Drizzle schema 模块
server/db/migrations/     drizzle-kit 生成的迁移
server/middleware/        API 网关、私有页面守卫
server/service/           业务服务层
server/utils/             服务端共享工具
server/plugins/           启动同步与单进程定时任务
modules/api-manifest.ts   构建期接口清单生成器
shared/                   共享类型与配置
docs/                     项目文档
```

## 公开接口约定

公开接口位于 `server/routes/v{N}/<code>/`，遵循 Nitro 的文件路由约定，**不带 `/api/` 前缀**：

- 第一层目录 / 文件名即接口 `code`，例如 `server/routes/v1/crypto/`
- 同一 `code` 下的多个 HTTP 方法文件聚合为同一个接口的多个 endpoint
- 物理删除接口文件夹后，`manifestSync` 会将对应记录标记为 `isOrphaned` 并强制下线，后台仍可调整其分类等元数据

更多约定见 [docs/](docs/) 目录。

## 部署说明

请对一个 PostgreSQL 数据库只运行**唯一一个** Node 服务进程。PostgreSQL 仅持久化业务数据，运行时计数器只存在于 Node 内存中。

`pending_charges` 表用于计费可靠性：它保存失败的扣费尝试，由单进程的重试 worker 处理。

## 致谢

本项目构建于 Nuxt、Nitro、Nuxt UI、Tailwind CSS、Drizzle ORM、postgres.js、pglite、Zod、Unovis、VueUse、ESLint、TypeScript 与 nodemailer 等优秀的开源项目之上。

## 许可证

[MIT](./LICENSE) NuoXianTech
