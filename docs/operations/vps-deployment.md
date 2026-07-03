# VPS 部署指南

本项目推荐按单个 Node/Nitro 进程加一个 PostgreSQL 数据库部署。

## 本地或 CI 构建

```bash
pnpm install --frozen-lockfile
pnpm build
```

构建命令会生成 `.output/server/index.mjs`、`.output/start.mjs` 和 `.output/package.json`。启动 `.output/start.mjs` 时会先运行数据库迁移，再启动 Nitro。

## 上传文件

将整个 `.output` 目录上传到服务器。生产入口为：

```bash
node .output/start.mjs
```

如果当前目录已经在 `.output` 内，使用：

```bash
node start.mjs
```

## 服务器环境变量

在服务器面板或进程管理器中配置以下变量：

```bash
NITRO_PORT=3000
NITRO_HOST=127.0.0.1
TZ=Asia/Shanghai

DATABASE_URL=postgresql://user:password@127.0.0.1:5432/openapi

NUXT_AUTH_ADMIN_USERNAME=admin
NUXT_AUTH_ADMIN_PASSWORD=change-me
NUXT_AUTH_ADMIN_EMAIL=admin@example.com
NUXT_AUTH_EMAIL_VERIFY_SECRET=change-me
NUXT_AUTH_API_KEY_SECRET=change-me
NUXT_AUTH_JWT_SECRET=change-me
```

生产密钥可用以下命令生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 启动

生成的启动脚本会在应用启动前运行迁移：

```bash
cd .output
node start.mjs
```

迁移执行器使用 `DATABASE_URL` 和 Drizzle 的 `drizzle.__drizzle_migrations` 表，因此已经应用过的迁移会自动跳过。

## 进程管理建议

PM2 是最简单的选择：

```bash
cd .output
pm2 start start.mjs --name openapi --update-env
pm2 save
```

发布新版本时：

```bash
cd .output
pm2 restart openapi --update-env
```

建议在 Node 进程前放置 Nginx，并反向代理到 `127.0.0.1:3000`。
