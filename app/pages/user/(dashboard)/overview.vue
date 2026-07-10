<script setup lang="ts">
import type { UserDashboardData } from '#shared/types/user-dashboard'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

useHead({ title: '个人中心' })

const { user } = useAuth()
const toast = useToast()

const requestURL = useRequestURL()
const origin = requestURL.origin || ''

function createEmptyUserDashboardData(): UserDashboardData {
  return {
    credits: { balance: 0, totalSpent: 0, spent24h: 0 },
    calls: { total: 0, success: 0, failure: 0, successRate: 0, requests24h: 0 },
    apiKeys: { total: 0, active: 0 },
    trend: [],
    generatedAt: new Date(0).toISOString()
  }
}

const { data, error } = usePrivateResource<UserDashboardData>({
  path: '/api/user/dashboard',
  defaultData: createEmptyUserDashboardData
})

watch(error, (err) => {
  if (err) {
    toast.add({ title: '加载概览失败', color: 'error' })
  }
})

const credits = computed(() => data.value.credits)
const calls = computed(() => data.value.calls)
const apiKeys = computed(() => data.value.apiKeys)
const trend = computed(() => data.value.trend)
const callsTrendValues = computed(() => trend.value.map(point => point.totalCalls))
const spendTrendValues = computed(() => trend.value.map(point => point.creditsSpent))
const hasKeys = computed(() => apiKeys.value.total > 0)
const sampleCurl = computed(() => [
  `curl -X GET '${origin}/v1/your-endpoint' \\`,
  `  -H 'x-api-key: <your-api-key>'`
].join('\n'))

interface UserOverviewMetricAction {
  label: string
  to: string
  icon: string
}

interface UserOverviewMetricCard {
  key: string
  label: string
  value: string
  unit?: string
  icon: string
  tone: 'neutral' | 'info' | 'warning' | 'success'
  sparklineValues?: number[]
  sparklineColor?: string
  action?: UserOverviewMetricAction
}

const overviewMetricCards = computed<UserOverviewMetricCard[]>(function getUserOverviewMetricCards() {
  return [
    {
      key: 'spent24h',
      label: '近 24 小时消耗',
      value: credits.value.spent24h.toLocaleString(),
      unit: '积分',
      icon: 'i-mdi-fire',
      tone: 'warning',
      sparklineValues: spendTrendValues.value,
      sparklineColor: 'var(--ui-warning)'
    },
    {
      key: 'totalSpent',
      label: '历史累计消耗',
      value: credits.value.totalSpent.toLocaleString(),
      unit: '积分',
      icon: 'i-mdi-chart-line',
      tone: 'neutral',
      sparklineValues: spendTrendValues.value,
      sparklineColor: 'var(--ui-primary)'
    },
    {
      key: 'totalCalls',
      label: '请求计数',
      value: calls.value.total.toLocaleString(),
      unit: '次',
      icon: 'i-mdi-heart-pulse',
      tone: 'info',
      sparklineValues: callsTrendValues.value,
      sparklineColor: 'var(--ui-info)'
    },
    {
      key: 'balance',
      label: '剩余额度',
      value: credits.value.balance.toLocaleString(),
      unit: '积分',
      icon: 'i-mdi-cash-multiple',
      tone: 'success',
      action: { label: '查看积分', to: '/user/credits', icon: 'i-mdi-arrow-right' }
    }
  ]
})

async function copyCurl() {
  try {
    await navigator.clipboard.writeText(sampleCurl.value)
    toast.add({ title: '已复制示例请求', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="user-overview">
    <template #header>
      <DashboardPageNavbar title="概览" />
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Hero / Onboarding -->
        <div class="overview-hero dashboard-hero-surface dashboard-hero-surface-mixed relative overflow-hidden rounded-lg border border-default p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-5 relative z-10">
            <div class="lg:col-span-3 space-y-5">
              <div class="space-y-3">
                <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-highlighted">
                  几分钟内开始使用你的 API 网关
                </h2>
                <p class="text-sm sm:text-base text-toned max-w-xl">
                  你好<span v-if="user?.username">，{{ user.username }}</span>。在这里你可以管理 API 密钥、查看余额与调用量，监控服务健康状态。
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  to="/user/apikeys"
                  color="neutral"
                  size="md"
                  icon="i-mdi-key-plus"
                >
                  创建 API 密钥
                </UButton>
                <UButton
                  to="/user/credits"
                  color="neutral"
                  variant="outline"
                  size="md"
                  icon="i-mdi-cash-multiple"
                >
                  管理积分
                </UButton>
              </div>
            </div>

            <div class="lg:col-span-2 min-w-0">
              <div class="rounded-lg border border-default bg-elevated p-4 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-mdi-console-line"
                      class="size-4 text-muted"
                    />
                    <span class="text-sm font-medium">首个 API 请求</span>
                  </div>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-mdi-content-copy"
                    @click="copyCurl"
                  >
                    复制
                  </UButton>
                </div>
                <pre class="font-mono text-[11px] leading-relaxed text-toned bg-elevated/50 rounded-md p-3 overflow-x-auto"><code>{{ sampleCurl }}</code></pre>

                <div class="border-t border-default pt-3 space-y-2.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted">API 密钥</span>
                    <span
                      v-if="hasKeys"
                      class="inline-flex items-center gap-1.5 text-success font-medium"
                    >
                      <span class="size-1.5 rounded-full bg-success" />
                      已就绪
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1.5 text-warning font-medium"
                    >
                      <span class="size-1.5 rounded-full bg-warning" />
                      未创建
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Usage Overview -->
        <section class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">
                用量概览
              </h3>
              <p class="text-sm text-muted">
                监控余额、用量和请求量
              </p>
            </div>
            <UButton
              to="/user/logs"
              size="xs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-mdi-chevron-right"
            >
              查看调用日志
            </UButton>
          </div>

          <div class="grid gap-3 lg:grid-cols-4">
            <DashboardMetricCard
              v-for="card in overviewMetricCards"
              :key="card.key"
              class="lg:col-span-1"
              :label="card.label"
              :value="card.value"
              :unit="card.unit"
              :icon="card.icon"
              :tone="card.tone"
              :sparkline-values="card.sparklineValues"
              :sparkline-color="card.sparklineColor"
            >
              <template
                v-if="card.action"
                #footer
              >
                <UButton
                  :to="card.action.to"
                  block
                  color="neutral"
                  :trailing-icon="card.action.icon"
                >
                  {{ card.action.label }}
                </UButton>
              </template>
            </DashboardMetricCard>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
