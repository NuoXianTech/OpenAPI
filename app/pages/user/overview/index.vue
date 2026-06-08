<script setup lang="ts">
import type { UserDashboardData } from '~~/shared/types/user-dashboard'

useHead({ title: '个人中心' })

definePageMeta({ layout: 'user', middleware: 'auth-user' })

const { user } = useAuth()
const toast = useToast()

const requestURL = useRequestURL()
const origin = requestURL.origin || ''

const data = ref<UserDashboardData | null>(null)
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    data.value = await $fetch<UserDashboardData>('/api/user/dashboard')
  } catch (err) {
    console.error('failed to load user dashboard', err)
    toast.add({ title: '加载概览失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})

const credits = computed(() => data.value?.credits ?? { balance: 0, totalSpent: 0, spent24h: 0 })
const calls = computed(() => data.value?.calls ?? { total: 0, success: 0, failure: 0, successRate: 0, requests24h: 0 })
const apiKeys = computed(() => data.value?.apiKeys ?? { total: 0, active: 0 })
const trend = computed(() => data.value?.trend ?? [])

const callsTrendValues = computed(() => trend.value.map(p => p.totalCalls))
const spendTrendValues = computed(() => trend.value.map(p => p.creditsSpent))

const hasKeys = computed(() => apiKeys.value.total > 0)

const sampleCurl = computed(() => {
  return [
    `curl -X GET '${origin}/api/your-endpoint' \\`,
    `  -H 'x-api-key: <your-api-key>'`
  ].join('\n')
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
      <UDashboardNavbar title="概览">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions
            :on-refresh="refresh"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Hero / Onboarding -->
        <div class="overview-hero relative overflow-hidden rounded-2xl border border-default p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-5 relative z-10">
            <div class="lg:col-span-3 space-y-5">
              <div class="space-y-3">
                <UBadge
                  color="neutral"
                  variant="solid"
                  size="sm"
                  class="bg-elevated/80 text-default backdrop-blur"
                >
                  开始使用
                </UBadge>
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
              <div class="rounded-xl bg-elevated/85 border border-default backdrop-blur-sm p-4 space-y-4 shadow-sm">
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
              to="/user/calls"
              size="xs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-mdi-chevron-right"
            >
              查看调用日志
            </UButton>
          </div>

          <div class="grid gap-4 lg:grid-cols-4">
            <UCard
              :ui="{ body: 'space-y-3' }"
              class="lg:col-span-1"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">近 24 小时消耗</span>
                <UIcon
                  name="i-mdi-fire"
                  class="size-4 text-warning"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ credits.spent24h.toLocaleString() }}
                <span class="text-xs font-normal text-muted ml-1">积分</span>
              </div>
              <UserOverviewSparkline
                :values="spendTrendValues"
                color="var(--ui-warning)"
              />
            </UCard>

            <UCard
              :ui="{ body: 'space-y-3' }"
              class="lg:col-span-1"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">历史累计消耗</span>
                <UIcon
                  name="i-mdi-chart-line"
                  class="size-4 text-primary"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ credits.totalSpent.toLocaleString() }}
                <span class="text-xs font-normal text-muted ml-1">积分</span>
              </div>
              <UserOverviewSparkline
                :values="spendTrendValues"
                color="var(--ui-primary)"
              />
            </UCard>

            <UCard
              :ui="{ body: 'space-y-3' }"
              class="lg:col-span-1"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">请求计数</span>
                <UIcon
                  name="i-mdi-heart-pulse"
                  class="size-4 text-info"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ calls.total.toLocaleString() }}
                <span class="text-xs font-normal text-muted ml-1">次</span>
              </div>
              <UserOverviewSparkline
                :values="callsTrendValues"
                color="var(--ui-info)"
              />
            </UCard>

            <!-- Wallet & Status -->
            <UCard
              :ui="{ body: 'space-y-4' }"
              class="lg:col-span-1 ring-1 ring-primary/10"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">剩余额度</span>
                <UIcon
                  name="i-mdi-cash-multiple"
                  class="size-4 text-warning"
                />
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                {{ credits.balance.toLocaleString() }}
                <span class="text-xs font-normal text-muted ml-1">积分</span>
              </div>
              <UButton
                to="/user/credits"
                block
                color="neutral"
                trailing-icon="i-mdi-arrow-right"
              >
                积分
              </UButton>
            </UCard>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.overview-hero {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--ui-primary) 14%, transparent) 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, color-mix(in oklab, var(--ui-warning) 12%, transparent) 0%, transparent 60%),
    radial-gradient(140% 100% at 100% 100%, color-mix(in oklab, var(--ui-success) 10%, transparent) 0%, transparent 60%),
    var(--ui-bg);
}
</style>
