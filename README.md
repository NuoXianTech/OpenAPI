# OpenAPI

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?logo=nuxt)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js)](https://vuejs.org)
[![Node.js](https://img.shields.io/badge/Node.js-24.13.0-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 一个基于 Nuxt.js 构建的 API 公共接口服务平台，提供完整的 API 管理、调用监控、版本控制和 API Key 认证系统，帮助开发者快速构建和管理 API 服务

---

## 📖 项目简介

OpenAPI 是一个面向开发者的 API 公共接口服务平台，基于 Nuxt 4 全栈框架打造。平台提供从接口发布、Key 认证、调用限流到调用监控的一站式能力，并配套完整的用户体系、积分扣费和管理后台，方便快速搭建一个可对外开放的 API 服务站点。

### ✨ 特性亮点

- 🎯 构建期自动扫描 `server/routes/v{N}/`，零配置生成 API manifest
- 🔐 完整的 API Key 自助管理 + 用户/管理员双端鉴权体系
- 📊 调用日志中间件 + 日聚合统计，公共统计页可视化展示
- 🛡️ 内置 API Guard：QPS / 分钟 / 小时 / 日级限流 + 每日配额
- 💳 积分系统：按 `costCredits` 自动扣费，支持兑换码充值
- 🔑 第三方登录（GitHub / QQ），密钥 AES-256-GCM 加密落库
- 🎨 基于 Nuxt UI v4 + Tailwind CSS v4 的现代化界面
- 📦 多 driver 限流支持（memory / postgres / kv），自动适配部署环境

## 📸 截图

> 截图待补充，可放置于 `screenshots/` 目录后引用。

---

## 🛠️ 技术栈

| 组件             | 版本     |
|----------------|--------|
| Nuxt           | 4.4.5  |
| Vue            | 3.5.34 |
| Nuxt UI        | 4.7.1  |
| Tailwind CSS   | 4.3.0  |
| Drizzle ORM    | 0.45.2 |
| PostgreSQL     | 16+    |
| Node.js        | 24.13.0|

**前端技术：** Nuxt 4、Vue 3、Nuxt UI v4、Tailwind CSS v4、@unovis/vue（图表）、VeeValidate + Zod

**后端技术：** Nuxt Server API（Nitro）、Drizzle ORM + drizzle-kit、PostgreSQL（开发可结合 pglite）、自研 Session 鉴权（仅存哈希）、AES-256-GCM 加密

**测试 & 工程化：** Vitest + @nuxt/test-utils（e2e）、ESLint、TypeScript

**开发环境详情：**

```
Node.js 24.13.0
Nuxt 4.4.5 • channel stable
Vue 3.5.34 • Drizzle ORM 0.45.2
PostgreSQL 16+
```

**部署环境支持：**

```
本地: Node.js + PostgreSQL
Serverless: NuxtHub / Cloudflare Workers（KV 限流自动启用）
多实例: Node + 共享 PostgreSQL（postgres driver）
```

---

## 📋 功能状态

### ✅ 核心功能

| 功能模块       | 状态 | 说明                                                          |
|------------|----|-------------------------------------------------------------|
| 公开 API     | ✅  | 搜索 / 状态筛选 / 分类（`apiCategories`），manifest 构建期自动扫描            |
| 用户体系       | ✅  | 注册、邮箱验证、登录、忘记/重置密码、会话管理、邮箱与密码变更、显示名                         |
| 第三方登录      | ✅  | 内置 GitHub / QQ adapter，state 签名 Cookie 防 CSRF，密钥 AES-GCM 加密 |
| API Key 自助 | ✅  | 用户中心新增 / 删除 / 重置 Key                                       |
| 积分管理       | ✅  | 兑换码充值、按 `costCredits` 自动扣费、管理员调账                            |
| API Guard  | ✅  | QPS / 分钟 / 小时 / 日级限流 + 每日配额，多 driver                        |
| 调用监控       | ✅  | 中间件自动记录调用日志并按日聚合，TOP 接口榜单                                   |
| 管理后台       | ✅  | 用户 / API / 分类 / 友链 / 公告 / 通知 / 兑换码 / Provider / 设置          |
| 审计日志       | ✅  | 管理端关键操作写入 `operation_logs`，可按 actor/action/resource 过滤      |

> API Guard 限流 driver 默认按部署环境自动选择（NuxtHub → `kv`，否则 → `memory`）；
>
> 多实例 Node + 共享 PG 可显式切到 `postgres`，支持横向扩展场景。

------

### ✅ 管理后台

| 功能模块    | 状态 | 说明                                       |
|---------|----|------------------------------------------|
| 用户管理    | ✅  | 用户列表 / 状态调整 / 积分调账                       |
| API 管理  | ✅  | 接口元数据、版本、分类、限流配置                         |
| 分类管理    | ✅  | `apiCategories` 增删改查                     |
| 内容运营    | ✅  | 公告、通知、友情链接                               |
| 兑换码     | ✅  | 批量生成、状态管理、兑换记录                           |
| Provider | ✅  | 第三方登录 Provider 动态启停，密钥落库加密               |
| 站点设置    | ✅  | 站点信息 / SMTP / 注册策略，`site_settings` 实时生效  |
| 操作日志    | ✅  | 写操作统一经 `operationLogService.addLog` 留痕   |

-----

### ✅ 安全模块

| 功能模块    | 状态 | 说明                                                              |
|---------|----|-----------------------------------------------------------------|
| 会话鉴权    | ✅  | Cookie 仅保存原始 sessionId，库中存 `sha256(sessionId)`                  |
| 密码存储    | ✅  | Node 内置 `scrypt`，按 `scrypt$<salt>$<hash>` 落库                    |
| 密钥加密    | ✅  | OAuth `clientSecret` / `accessToken` / `refreshToken` AES-256-GCM |
| OAuth state | ✅  | 签名 Cookie（`nonce.provider.returnTo.hmac`）+ 5 分钟 TTL              |
| 审计留痕    | ✅  | 管理端写操作统一经 `operationLogService` 落库                              |

> 站点信息、SMTP、注册策略等运行时配置读自 `site_settings` 表，可在后台「站点设置」实时修改

### 🚧 持续优化

| 功能模块             | 进度 | 说明                          |
|------------------|----|-----------------------------|
| ~~Manifest 自动扫描~~ | ✅  | 构建期自动扫描 `server/routes/v{N}/` |
| ~~多 driver 限流~~   | ✅  | memory / postgres / kv 三选一  |
| ~~OAuth 加密落库~~   | ✅  | AES-256-GCM 主密钥 32 字节       |
| ~~按日聚合统计~~       | ✅  | 公共统计页 + TOP 接口榜单            |

### 📝 待优化

- [ ] 调用统计图表丰富化 (按用户 / 按 IP 维度)
- [ ] WebHook 通知 (调用异常 / 配额告警)
- [ ] 多语言 (i18n) 支持

---

## 🚀 快速开始

### 环境要求

- Node.js >= 24.13.0
- PostgreSQL >= 16
- pnpm（推荐）

### 安装依赖

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
pnpm install
```

### 环境变量

```bash
# 1) 复制环境变量模板
cp .env.example .env

# 2) 生成 OAUTH_SECRET_KEY（32 字节）写入 .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| 变量名                                 | 必需               | 说明                                       |
|-------------------------------------|------------------|------------------------------------------|
| `DATABASE_URL`                      | 是                | PostgreSQL 连接串                            |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 是                | 管理员账号                                    |
| `ADMIN_EMAIL`                       | 否                | 管理员展示邮箱                                  |
| `EMAIL_VERIFY_SECRET`               | 建议               | 邮箱验证 / OAuth state 签名密钥                  |
| `OAUTH_SECRET_KEY`                  | 启用 OAuth 时必需     | AES-256-GCM 主密钥；32 字节 hex / base64url / utf-8 |

### 运行项目

```bash
# 生成并执行数据库迁移
pnpm run db:generate
pnpm run db:migrate

# 启动开发服务器
pnpm run dev
```

启动后访问 `http://localhost:3000`。

### 构建发布

```bash
# 构建生产环境
pnpm run build

# 预览生产构建
pnpm run preview
```

### 常用命令

```bash
# 数据库
pnpm run db:generate        # 由 schema.ts 生成迁移 SQL
pnpm run db:migrate         # 应用迁移

# 质量检查
pnpm run lint
pnpm run lint:fix

# 测试
pnpm run test
pnpm run test:e2e
```

---

## 📂 项目结构

```text
.
├─ app/                     # Nuxt 前端
│  ├─ pages/                # 页面（含 admin / user 子路由）
│  ├─ components/           # admin / api / common / link / stats / user
│  ├─ composables/          # auth / api list / link / settings ...
│  ├─ layouts/              # admin 布局
│  └─ middleware/           # auth-admin / auth-user 路由守卫
├─ server/                  # Nuxt 服务端
│  ├─ api/                  # admin / auth / user / stats / ...
│  ├─ routes/v{N}/          # 对外开放的 API 实现，构建期被 manifest 扫描
│  ├─ db/
│  │  ├─ schema/            # Drizzle schema（user / auth / api / content / system）
│  │  └─ migrations/        # drizzle-kit 生成，勿手改
│  ├─ middleware/           # api-gate
│  ├─ service/              # 业务服务层
│  ├─ utils/                # 鉴权、邮件、AES-GCM、OAuth、限流 driver、manifest ...
│  └─ plugins/              # manifestSync / apiCallStats 等启动钩子
├─ modules/api-manifest.ts  # 构建期扫描生成 manifest
├─ shared/                  # 前后端共享类型
├─ tests/e2e/               # e2e 测试
├─ .env.example
└─ nuxt.config.ts
```

---

## 🔐 OAuth 接入（GitHub 示例）

1. 在 GitHub Developer Settings 创建 OAuth App。
2. Callback URL 填 `http://<SITE_URL>/callback/openid/0`（索引顺序与 `shared/types/oauth.ts` 中 `SUPPORTED_OAUTH_PROVIDERS` 一致：0=github，1=qq）。
3. 后台 → 「第三方登录」→ 新增 Provider，填入 `clientId` / `clientSecret`（落库时自动加密）、`scopes`、`authorizeUrl` / `tokenUrl` / `userInfoUrl` / `callbackUrl`，开启 `isEnabled`。
4. 登录页将自动出现对应按钮。

回调流程（`server/routes/callback/openid/[index].get.ts` → `server/utils/oauthCallback.ts`）：

> 校验 state Cookie（5 分钟、HMAC）→ 命中 `(provider, providerUserId)` 则登录 → 否则按 email 自动绑定到既有用户 → 仍未命中则按规则创建新用户。

---

## 📬 联系方式

- 📧 问题反馈：提交 [Issue](https://github.com/NuoXianTech/OpenAPI/issues)
- 💬 讨论交流：暂无

---

## 👏 贡献

1. Fork 并创建分支。
2. 完成开发或修复。
3. 跑 `pnpm run lint` 与相关测试。
4. 提交 Pull Request。

如果这个项目对你有帮助，请给一个 ⭐️ Star 支持！

---

## ⚖️ 开源协议 (License)

本项目采用 **MIT License** 协议开源。

详情请参阅项目根目录下的 [LICENSE](./LICENSE) 文件。

---

> 本项目部分代码与文档由 AI 辅助生成，提交前已人工 review。
