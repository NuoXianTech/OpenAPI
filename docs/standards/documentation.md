# 文档写作标准

本标准适用于 `docs/**` 下的 Markdown。目标是让文档像工程代码一样可导航、可审查、可维护，并能支撑生产环境交付。

## 信息架构

| 类型 | 文件位置 | 职责 |
| --- | --- | --- |
| 总入口 | `docs/index.md` | 角色化快速入口、文档地图、生产门禁和目录结构 |
| 分域入口 | `docs/<domain>/index.md` | 解释阅读顺序、维护边界和跨域链接 |
| 标准页 | `docs/standards/*.md` | 定义长期稳定的工程约束 |
| 流程页 | `docs/operations/*.md`、`docs/api/*onboarding*.md` | 给出可复制步骤、检查项和回滚路径 |
| 规则页 | `docs/platform/*.md`、`docs/api/*conventions*.md` | 描述业务规则、接口契约和一致性要求 |
| 资产 | `docs/assets/<domain>/` | 存放 README、品牌和文档引用资源 |

新增文档必须先判断是否属于已有分域。只有当内容跨越多个分域且会长期复用时，才新增目录。

## Markdown 结构

- 每个文件只有一个一级标题。
- 标题层级不跳级，避免从 `##` 直接到 `####`。
- 开头第一段说明适用范围和目标。
- 表格用于对比、职责、检查项；步骤用有序列表；零散注意点用短列表。
- 命令必须可复制，使用 `bash` 代码块。
- TypeScript / Vue 示例必须使用项目约定：`interface`、具名函数、`<script setup lang="ts">`。

## 链接规则

- 仓库内文档使用相对链接。
- 外部规范优先链接官方文档；Nuxt 使用 `https://nuxt.com/docs/4.x/**`，Nuxt UI 使用 `https://ui.nuxt.com/docs/**`。
- 链接到生产操作时优先链接 [生产就绪清单](../operations/production-readiness.md) 或 [生产运行手册](../operations/production-runbook.md)。
- 不保留裸 URL，除非它是配置值、命令输出或日志内容。

## 代码示例

示例必须短、完整、可迁移。不要把业务无关的装饰代码放进规范页。

```vue
<script setup lang="ts">
interface SubmitState {
  isSubmitting: boolean
}

const submitState = reactive<SubmitState>({
  isSubmitting: false
})

async function submitForm(): Promise<void> {
  submitState.isSubmitting = true
  try {
    await $fetch('/api/example', { method: 'POST' })
  } finally {
    submitState.isSubmitting = false
  }
}
</script>
```

## 生产内容要求

生产相关文档必须包含：

| 内容 | 要求 |
| --- | --- |
| 前置条件 | 运行时变量、数据库、权限、备份和质量门禁 |
| 执行步骤 | 从构建到启动的顺序，命令可复制 |
| 验证方法 | 健康检查、关键路径、日志和指标 |
| 回滚方案 | 应用回滚和数据库风险说明 |
| 风险边界 | 单实例限制、密钥风险、不可逆迁移、人工处理项 |

## Nuxt UI 文档化建议

如果后续把 `docs` 接入 Nuxt Content 或 Nuxt UI 的内容组件，可优先使用 Nuxt UI MCP 中列出的内容组件：`ContentNavigation`、`ContentSearch`、`ContentToc`、`ContentSurround` 以及 typography prose 组件。当前仓库的 `docs` 仍是普通 Markdown，因此先保持 GitHub 兼容语法。

## 自检清单

- 新文档已在对应 `index.md` 挂载。
- 相对链接能解析。
- 没有真实密钥、token、邮箱验证码或生产连接串。
- 命令不会破坏用户环境，危险命令有前置说明。
- 文档能回答“谁读、何时读、照做会发生什么”。
