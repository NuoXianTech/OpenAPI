# OpenAPI

<p>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v24.13.0-28CF8D?labelColor=18181B" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-v10.15.0-28CF8D?labelColor=18181B" alt="pnpm"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-4.x-18181B?logo=nuxt" alt="Nuxt"></a>
</p>

OpenAPI 是一个基于 Nuxt 4（Vue 3）的全栈 API 服务平台，覆盖公开接口展示、用户注册登录、API Key 自助管理、后台运营管理和调用统计看板。

项目采用 Nuxt 4 新目录结构（前端在 `app/`，服务端在 `server/`），后端基于 Nitro + Drizzle ORM + PostgreSQL，前端使用 shadcn-vue 与 Tailwind CSS v4。

## 功能概览

- 公开 API 列表：支持搜索、状态筛选、分类筛选。
- 用户体系：注册、邮箱验证、登录、会话管理。
- API Key 自助：用户可在个人后台新增、删除、重置 API Key。
- 管理员后台：用户管理、API 管理、友情链接管理、FAB 菜单管理、调用统计。
- 调用监控：中间件自动记录 API 调用日志并聚合为日维度统计。
- 公共统计页：提供总览、近 7 日趋势、当日 TOP 调用接口等指标。

## 技术栈

前端：

- Nuxt 4.4.x / Vue 3
- shadcn-vue + shadcn-nuxt
- Tailwind CSS v4
- @unovis/vue（图表）

后端：

- Nuxt Server API（Nitro）
- Drizzle ORM + drizzle-kit
- PostgreSQL（开发阶段也可结合 pglite）
- 自定义 Session 与鉴权中间件

测试与工程化：

- Vitest + @nuxt/test-utils（e2e）
- ESLint（含 `lint` / `lint:fix`）
- TypeScript

## 项目结构

```text
.
├─ app/                     # Nuxt 前端（页面、组件、composables）
│  ├─ pages/                # 页面路由（含 admin 与 user 子路由）
│  ├─ components/           # 业务组件 + ui 组件
│  ├─ composables/          # 前端组合式逻辑（auth、api list、site settings 等）
│  └─ middleware/           # 前端路由守卫（auth-admin、auth-user）
├─ server/                  # Nuxt 服务端
│  ├─ api/                  # 后端接口路由
│  ├─ db/                   # Drizzle schema 与 migrations
│  ├─ middleware/           # 服务端中间件（api-call-stats）
│  ├─ service/              # 业务服务层
│  └─ utils/                # 鉴权、邮件、校验等工具
├─ shared/                  # 前后端共享常量与类型
├─ tests/e2e/               # e2e 测试
└─ nuxt.config.ts           # Nuxt 配置
```

## 环境要求

- Node.js >= 24.13.0
- pnpm
- PostgreSQL 16+

## 快速开始

```bash
# 1) 克隆项目
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI

# 2) 安装依赖
pnpm install

# 3) 复制环境变量
cp .env.example .env

# 4) 生成并执行数据库迁移
pnpm run db:generate
pnpm run db:migrate

# 5) 启动开发服务器
pnpm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

启动后默认访问：`http://localhost:3000`

## 环境变量

以下为最常用变量，完整可按实际部署场景扩展：

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `ADMIN_USERNAME` | 是 | 管理员用户名 |
| `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` | 是（二选一） | 管理员密码明文或哈希 |
| `ADMIN_EMAIL` | 否 | 管理员展示邮箱 |
| `EMAIL_VERIFY_SECRET` | 建议 | 邮箱验证签名密钥 |
| `SITE_URL` | 否 | 站点地址，影响邮件验证链接 |
| `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_IMG` | 否 | 站点展示信息默认值 |
| `START_TIME` | 否 | 首页运行时长起始时间 |
| `SESSION_MAX_AGE` | 否 | Session 有效期（秒） |
| `EMAIL_VERIFY_EXPIRES_IN` | 否 | 邮箱验证链接有效期（分钟） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | 否 | SMTP 服务配置 |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 否 | SMTP 鉴权与发件配置 |

示例见 `.env.example`：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456
ADMIN_EMAIL=admin@example.com
EMAIL_VERIFY_SECRET=openapi-email-verify-secret
DATABASE_URL=postgresql://user:password@localhost:5432/OpenApi
```

## 常用命令

```bash
# 开发与构建
pnpm run dev
pnpm run build
pnpm run preview

# 数据库
pnpm run db:generate
pnpm run db:migrate

# 质量检查
pnpm run lint
pnpm run lint:fix

# 测试
pnpm run test
pnpm run test:e2e
pnpm run test:e2e:ci
pnpm run test:e2e:apis
pnpm run test:e2e:friend-links
pnpm run test:e2e:users
pnpm run test:e2e:calls
```

## 测试说明

- e2e 入口位于 `tests/e2e/`。
- 运行 e2e 前请确保数据库迁移已完成。
- 如需复用已启动的 Nuxt 服务，可设置 `NUXT_TEST_HOST`：

```bash
# Linux / macOS
NUXT_TEST_HOST=http://localhost:3000 pnpm run test:e2e
```

```powershell
# Windows PowerShell
$env:NUXT_TEST_HOST='http://localhost:3000'; pnpm run test:e2e
```

## 数据库变更约定

- 仅修改 `server/db/schema/` 中的 schema。
- 不要手工编辑 `server/db/migrations/`。
- 通过 `pnpm run db:migrate` 生成并执行迁移。

## 开发参考

- Nuxt 4 文档：https://nuxt.com/docs/4.x/getting-started/introduction
- NuxtHub 文档：https://hub.nuxt.com/docs/getting-started
- shadcn-vue 文档：https://www.shadcn-vue.com/docs/introduction

## 贡献指南

1. Fork 本仓库并创建分支。
2. 完成功能开发或修复。
3. 运行 `pnpm run lint` 与相关测试命令。
4. 提交 Pull Request。

## License

MIT
