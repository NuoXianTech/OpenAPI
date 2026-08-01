# 发布流程

本文说明 OpenAPI 项目如何创建版本、触发 GitHub Actions，以及使用已经构建好的 GitHub Release 或 GHCR 产物部署生产环境。

项目不发布 npm 包。正式部署物统一由 GitHub Actions 在 Linux 环境中构建，生产服务器只下载产物或拉取镜像，不执行 `pnpm install`、`pnpm build` 或 Docker 镜像构建。这样可以避免 Nuxt/Nitro 构建阶段占用数 GB 内存。

发布前还应完成 [生产就绪清单](./production-readiness.md)，运行时变量以 [运行时配置](./runtime-config.md) 为准。

## 发布通道

| Git 事件 | GitHub Release | GHCR 镜像 | 用途 |
| --- | --- | --- | --- |
| 推送到 `main` | 不创建 | 构建 `latest`（amd64/arm64） | 持续集成、测试最新主线 |
| 推送 `vX.Y.Z` 标签 | 构建并创建正式 Release | 构建 `X.Y.Z` 多架构镜像 | 正式生产版本 |
| 推送 `vX.Y.Z-rc.N` 标签 | 创建 Prerelease | 构建对应预发布镜像 | 发布候选版本 |

生产环境应固定版本号，例如 `ghcr.io/nuoxiantech/openapi:0.3.0`，不要长期依赖会继续变化的 `latest`。

## 版本号规则

项目使用 [Semantic Versioning](https://semver.org/)：

| 变更 | 版本选择 | 示例 |
| --- | --- | --- |
| 不兼容的公开行为或配置变更 | major | `1.4.2` → `2.0.0` |
| 向后兼容的新功能 | minor | `1.4.2` → `1.5.0` |
| 向后兼容的修复 | patch | `1.4.2` → `1.4.3` |
| 发布候选版本 | prerelease | `1.5.0-rc.1` |

Git 标签必须满足以下条件：

- 使用 `vX.Y.Z` 或 `vX.Y.Z-rc.N` 格式。
- 去掉 `v` 后必须与 `package.json` 中的 `version` 完全一致。
- 必须指向已经进入远端 `main` 的提交。
- 已发布的版本号和标签不得移动或重复使用；修复后发布新的 patch 版本。

## 发布前准备

1. 确认目标版本包含需要发布的代码和数据库迁移。
2. 为生产数据库创建备份或快照，并确认回滚路径。
3. 核对工作区，只提交本次发布需要的文件：

   ```bash
   git status --short
   ```

4. 本地至少完成与改动风险相称的检查。GitHub Release 工作流还会重新执行完整门禁：

   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm typecheck
   pnpm test:run
   pnpm build
   ```

`pnpm build` 应在开发机或 CI 执行，不能转移到生产服务器执行。

## 推荐：通过 Release PR 发布

Release PR 将版本变更和最终发布标签分开，便于审查，也能避免标签指向尚未合并的提交。以下以从 `0.2.0` 发布 `0.3.0` 为例。

### 1. 创建版本分支

```bash
git switch main
git pull --ff-only
git switch -c release/v0.3.0
pnpm version 0.3.0 --no-git-tag-version
```

`--no-git-tag-version` 只更新项目版本，不会在本地提前创建发布提交和标签。检查实际改动后再提交：

```bash
git diff
git add package.json pnpm-lock.yaml
git commit -m "chore(release): prepare v0.3.0"
git push -u origin release/v0.3.0
```

如果 `pnpm-lock.yaml` 没有变化，`git add` 会忽略它。创建 PR，等待检查通过并合并到 `main`。

### 2. 从更新后的 main 创建标签

PR 合并后重新同步本地分支：

```bash
git switch main
git pull --ff-only
node -p "require('./package.json').version"
git tag -a v0.3.0 -m "OpenAPI v0.3.0"
git push origin v0.3.0
```

不要在 PR 合并前推送版本标签。标签推送后，两条 GitHub Actions 工作流会并行构建 GitHub Release 产物和 GHCR 镜像。

## 可选：直接在 main 发布

仅在仓库允许直接推送且改动已经完成审查时使用。`pnpm version` 默认会修改版本、创建 Git commit 和同名 Git 标签，但不会自动推送：

```bash
git switch main
git pull --ff-only
pnpm version minor --message "chore(release): v%s"
git push origin main
git push origin v0.3.0
```

上例假设 `minor` 将当前版本更新为 `0.3.0`。推送前应以 `package.json` 和 `git tag --points-at HEAD` 的结果为准，不要照抄不匹配的标签名。

直接推送和 PR 合并产生的提交都会进入 Release Notes。工作流读取上一个版本标签到当前标签之间、位于 `main` 第一父级历史上的提交标题，因此提交信息应清楚描述用户可感知的变化。Squash Merge 时，PR 标题通常会成为这条提交信息。

## pnpm 命令与 Git 的关系

| 命令 | 修改版本 | 创建 commit | 创建 Git tag | 推送远端 |
| --- | --- | --- | --- | --- |
| `pnpm build` | 否 | 否 | 否 | 否 |
| `pnpm version 0.3.0 --no-git-tag-version` | 是 | 否 | 否 | 否 |
| `pnpm version 0.3.0` | 是 | 是 | 是 | 否 |
| `pnpm publish` | 不用于本项目 | 否 | 否 | 否 |

`package.json` 设置了 `"private": true`，因此本项目不应执行 `pnpm publish`。这里的“发布”是推送 Git 版本标签，让 GitHub Actions 创建应用产物和容器镜像。

## GitHub Actions 执行内容

### GitHub Release

`.github/workflows/release.yml` 会依次：

1. 校验标签格式、`package.json` 版本和标签是否位于 `main`。
2. 安装锁定依赖，运行 lint、类型检查和测试。
3. 在 GitHub Runner 上执行 `pnpm build`。
4. 将完整 `.output` 与部署辅助文件打包为 `openapi-X.Y.Z.tar.gz`。
5. 生成 `checksums.txt`，并创建或更新对应 GitHub Release。
6. 根据 Git 第一父级提交历史生成 Release Notes，兼容 PR 合并和直接提交到 `main` 的记录。

压缩包中的 `.output` 是可直接运行的 Nitro 生产产物，不需要在服务器重新安装依赖。

### GHCR 容器镜像

`.github/workflows/docker-publish.yml` 分别在原生 amd64 和 arm64 Runner 上构建镜像，再合并为多架构镜像。版本标签 `v0.3.0` 对应：

```text
ghcr.io/nuoxiantech/openapi:0.3.0
ghcr.io/nuoxiantech/openapi:0.3.0-amd64
ghcr.io/nuoxiantech/openapi:0.3.0-arm64
```

通常只需使用不带架构后缀的 `0.3.0`，Docker 会自动选择服务器架构。预发布标签不会作为稳定生产版本使用。

镜像发布并校验成功后，工作流会清理已经失去标签的历史镜像和旧工作流遗留的 `sha-*` 标签。清理过程会识别多架构镜像的引用关系，保留仍被 `latest`、正式版本或预发布版本引用的 amd64/arm64 子 manifest，并在删除后重新验证多架构镜像完整性。因此 GHCR 页面仍可能显示少量以 digest 标识的子 manifest；只要它们仍被有效标签引用，就不能单独删除。

## 部署 GitHub Release 产物

1. 从对应 GitHub Release 下载 `openapi-X.Y.Z.tar.gz` 和 `checksums.txt`。
2. 将两个文件放在同一目录并校验：

   ```bash
   sha256sum -c checksums.txt
   ```

3. 解压到新的版本目录，保留上一版本目录用于回滚。
4. 注入生产环境变量，从解压后的 `.output` 启动：

   ```bash
   cd .output
   NODE_ENV=production node server/index.mjs
   ```

PM2、Nginx、数据卷和目录切换方式见 [VPS 部署指南](./vps-deployment.md)。不要遗漏隐藏目录 `.output/server/node_modules/.nitro`。

## 部署 GHCR 镜像

先将 `docker-compose.yml` 中的镜像固定为新版本：

```yaml
services:
  openapi:
    image: ghcr.io/nuoxiantech/openapi:0.3.0
```

然后只在服务器拉取和重启：

```bash
docker compose pull
docker compose up -d
```

服务器不会执行源码构建。使用 PGlite 时必须继续挂载 `/app/.data`；使用 PostgreSQL 或 Redis 时，连接信息仍通过运行时环境变量传入。完整示例见 [VPS 部署指南](./vps-deployment.md)。

## 发布后验证

先确认 GitHub Release 和 Docker 两条工作流均成功，再在服务器检查：

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/api/catalog
```

随后验证统一登录页、管理员后台、用户后台、一个低风险公开 API、调用日志和积分流水。观察步骤和异常信号见 [生产运行手册](./production-runbook.md)。

## 回滚

- Docker：把镜像标签改回上一稳定版本，执行 `docker compose pull` 和 `docker compose up -d`。
- 原生产物：让 PM2 或服务管理器重新指向上一版本的 `.output`，再执行健康检查。
- 数据库：应用启动会自动执行迁移。发布前必须备份；迁移不可逆时，不能只回滚应用而忽略数据兼容性。

不要删除或移动已经对外发布的 Git 标签。回滚生产运行版本不等于重写发布历史，后续修复应使用新的 patch 版本。

## 常见失败

| 现象 | 原因与处理 |
| --- | --- |
| `Invalid release tag` | 标签不符合 `vX.Y.Z` 或预发布格式，修正版本命名后重新发布 |
| 标签与 `package.json` 不一致 | 在 `main` 提交正确版本号，使用新的匹配标签 |
| 标签不在 `main` | Release PR 尚未合并或标签指向错误提交；从更新后的 `main` 创建新标签 |
| Release Notes 内容缺失 | 检查版本之间是否存在第一父级提交，并确认直接提交或 PR 的提交标题有意义 |
| lint、类型检查、测试或 build 失败 | 工作流不会发布不完整产物；修复后提交并发布新的版本 |
| 只有一种 CPU 架构成功 | 查看对应 amd64/arm64 构建任务；两者成功后才会创建多架构清单 |
| GHCR 清理返回 403 | 在容器包设置的 Manage Actions access 中，为本仓库授予 Admin 权限 |
| 清理后仍显示少量 SHA digest | 它们可能是有效多架构镜像引用的子 manifest；工作流会保留这些必要版本 |
| 服务器内存不足 | 确认服务器只下载 Release 产物或 `docker pull`，没有执行 `pnpm build` 或 `docker build` |
