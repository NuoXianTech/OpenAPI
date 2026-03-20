# OpenAPI

<p>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v24.13.0-28CF8D?labelColor=18181B" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-v10.15.0-28CF8D?labelColor=18181B" alt="Version"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt%20Docs-18181B?logo=nuxt" alt="Nuxt"></a>
</p>

一个基于 Nuxt.js 构建的全栈式 API 公共接口服务平台，提供完整的 API 管理、调用监控、版本控制和 API Key 认证系统，帮助开发者快速构建和管理 API 服务。

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
- Tailwind CSS​ - 原子化 CSS 框架
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

# 4. 启动开发服务器
pnpm run dev
```

## 🔐 认证与邮箱配置

当前认证模式为 **Session + Cookie**，管理员后台账号密码来自 `.env`。

```bash
# Session会话过期时间（默认 7 天）
SESSION_MAX_AGE=604800

# 管理员后台账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=please-change-me
ADMIN_EMAIL=admin@openapi.local

# 站点 URL
SITE_URL=http://localhost:3000

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_user
SMTP_PASS=your_password
SMTP_FROM=no-reply@example.com
```

后台入口：

- 管理员后台登录：`/admin/login`
- 管理员后台页面：`/admin/auth-policy`（管理员控制台入口）
- 用户后台页面（API Key 增删重置）：`/user/apikeys`

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
