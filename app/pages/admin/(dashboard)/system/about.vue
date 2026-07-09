<script setup lang="ts">
interface AboutItem {
  label: string
  value: string
  icon: string
}

interface StackItem {
  label: string
  description: string
}

useHead({ title: '关于' })

const projectItems: AboutItem[] = [
  { label: '项目名称', value: 'OpenAPI', icon: 'i-mdi-api' },
  { label: '应用类型', value: 'API 服务聚合与开放平台', icon: 'i-mdi-transit-connection-variant' },
  { label: '管理模型', value: '多管理员 + 多用户', icon: 'i-mdi-account-supervisor-outline' },
  { label: '运行形态', value: 'Nuxt 全栈应用', icon: 'i-mdi-application-braces-outline' }
]

const capabilityItems: StackItem[] = [
  { label: '账号与权限', description: '统一登录入口，基于用户角色区分管理能力与用户能力。' },
  { label: 'API 管理', description: '维护接口、分类、调用成本、启用状态与统计口径。' },
  { label: '日志与审计', description: '集中查看调用、登录、积分与操作日志，保留关键操作者信息。' },
  { label: '运营能力', description: '支持公告、通知、友情链接、兑换码与积分体系。' },
  { label: '系统配置', description: '集中管理站点、邮件、验证码、会话与安全相关配置。' }
]

const stackItems: StackItem[] = [
  { label: 'Nuxt 4 / Vue 3', description: '使用 Composition API 与文件路由组织前后端能力。' },
  { label: 'Nuxt UI / Tailwind CSS', description: '构建一致、响应式、适合后台工作流的界面。' },
  { label: 'Nitro / H3', description: '提供服务端 API、鉴权中间件与运行时能力。' },
  { label: 'Drizzle ORM / PostgreSQL', description: '以类型安全方式维护数据库 schema、查询与迁移。' },
  { label: 'VueUse / Zod', description: '复用组合式工具，并对输入数据做结构化校验。' }
]

const operationItems: StackItem[] = [
  { label: '配置优先', description: '站点、邮件、验证码、OAuth 等运行参数集中在系统设置与环境变量中维护。' },
  { label: '审计优先', description: '管理动作和用户关键行为写入日志，便于追踪变更来源。' },
  { label: '角色清晰', description: '管理员可访问用户能力与管理能力，普通用户仅访问自身工作区。' },
  { label: '迁移可控', description: '数据库迁移随构建产物发布，并在生产进程接受请求前自动执行。' }
]
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      title="项目"
      description="OpenAPI 是一个面向 API 开放、运营管理与用户自助使用的全栈平台。"
    >
      <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="item in projectItems"
          :key="item.label"
          class="min-w-0"
        >
          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon
              :name="item.icon"
              class="size-4"
            />
            <span>{{ item.label }}</span>
          </div>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ item.value }}
          </p>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      title="能力"
      description="项目围绕 API 管理、用户自助、运营配置与审计追踪组织功能。"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in capabilityItems"
          :key="item.label"
          class="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <span class="text-sm font-medium text-highlighted">{{ item.label }}</span>
          <span class="max-w-2xl text-sm text-muted sm:text-right">{{ item.description }}</span>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      title="技术栈"
      description="当前项目以 Nuxt 全栈能力为核心，结合类型安全、组件化 UI 与结构化数据校验。"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in stackItems"
          :key="item.label"
          class="py-4 first:pt-0 last:pb-0"
        >
          <h3 class="text-sm font-semibold text-highlighted">
            {{ item.label }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ item.description }}
          </p>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      title="生产约定"
      description="这些约定用于保持多管理员、多用户环境中的可维护性和可追踪性。"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in operationItems"
          :key="item.label"
          class="flex gap-3 py-4 first:pt-0 last:pb-0"
        >
          <UIcon
            name="i-mdi-check-circle-outline"
            class="mt-0.5 size-4 shrink-0 text-success"
          />
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-highlighted">
              {{ item.label }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>
    </DashboardSettingsSection>
  </div>
</template>
