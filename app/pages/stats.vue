<script setup lang="ts">
import type {
  PublicCallStatsDashboard,
  PublicCallStatsResponse,
} from '~~/shared/types/public-stats'

// 图表依赖 d3 + DOM，体积较大。改为 lazy + client-only 异步组件，
// 让 stats 页主体可以 SSR，图表在客户端 hydrate 后再下载/渲染。
const VisXYContainer = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisXYContainer))
const VisLine = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisLine))
const VisAxis = defineAsyncComponent(() => import('@unovis/vue').then(m => m.VisAxis))

interface TrendChartRow {
  label: string
  成功次数: number
  失败次数: number
}

function createEmptyDashboard(): PublicCallStatsDashboard {
  return {
    overview: {
      totalCalls: 0,
      todayCalls: 0,
      yesterdayCalls: 0,
      successCalls: 0,
      failureCalls: 0,
      successRate: 0,
      userCount: 0,
      enabledTrackedApiCount: 0,
      trackedApiCount: 0,
    },
    trend7d: [],
    top10Last30d: [],
    generatedAt: new Date(0).toISOString(),
  }
}

function toShortDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(5)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

const EMPTY_DASHBOARD = createEmptyDashboard()

const SUCCESS_KEY = '成功次数' as const
const FAILURE_KEY = '失败次数' as const

const { turnstile } = useSiteSettings()
const turnstileRequired = computed(() => turnstile.value.publicStats)
const turnstileToken = ref('')
const turnstileWidget = ref<{ reset: () => void } | null>(null)

const data = ref<PublicCallStatsResponse | null>(null)
const pending = ref(false)
const error = ref<unknown>(null)

const fetchStats = async () => {
  pending.value = true
  error.value = null
  try {
    const headers: Record<string, string> = {}
    if (turnstileRequired.value && turnstileToken.value) {
      headers['x-turnstile-token'] = turnstileToken.value
    }
    data.value = await $fetch<PublicCallStatsResponse>('/api/stats/public', { headers })
  }
  catch (err) {
    error.value = err
    // token 是一次性的，验证失败后重置重拿
    if (turnstileRequired.value) {
      turnstileToken.value = ''
      turnstileWidget.value?.reset()
    }
  }
  finally {
    pending.value = false
  }
}

const reloadStats = async () => {
  error.value = null
  if (turnstileRequired.value) {
    data.value = null
    turnstileToken.value = ''
    turnstileWidget.value?.reset()
    return
  }
  await fetchStats()
}

// token 拿到后自动拉取
watch(turnstileToken, (val) => {
  if (val && turnstileRequired.value) {
    fetchStats()
  }
})

onMounted(() => {
  if (!turnstileRequired.value) {
    fetchStats()
  }
})

const dashboard = computed(() => data.value?.data || EMPTY_DASHBOARD)
const overview = computed(() => dashboard.value.overview)
const trend7d = computed(() => dashboard.value.trend7d)
const top10Last30d = computed(() => dashboard.value.top10Last30d)
const hasData = computed(() => data.value !== null)
const isInitialLoading = computed(() => pending.value && trend7d.value.length === 0 && top10Last30d.value.length === 0)
const showChallenge = computed(() => turnstileRequired.value && !hasData.value && !error.value)

const generatedAtLabel = computed(() => {
  const date = new Date(dashboard.value.generatedAt)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
})

const trendChartData = computed<TrendChartRow[]>(() => {
  return trend7d.value.map(item => ({
    label: toShortDate(item.date),
    [SUCCESS_KEY]: item.successCalls,
    [FAILURE_KEY]: item.failureCalls,
  }))
})

const xAccessor = (_item: TrendChartRow, index: number) => index
const successLineAccessor = (item: TrendChartRow) => item[SUCCESS_KEY]
const failureLineAccessor = (item: TrendChartRow) => item[FAILURE_KEY]

const xTickFormat = (tick: number | Date | string) => {
  if (typeof tick === 'string') {
    return tick
  }

  if (typeof tick === 'number') {
    const maxIndex = Math.max(trendChartData.value.length - 1, 0)
    const index = Math.min(maxIndex, Math.max(0, Math.round(tick)))
    return trendChartData.value[index]?.label || ''
  }

  return ''
}

const yTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') {
    return ''
  }
  return `${Math.round(tick)}`
}

const formatRate = (value: number) => `${value.toFixed(2)}%`
const formatCount = (value: number) => value.toLocaleString()

const formatMethod = (value: string) => {
  return value
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
    .join(' / ')
}

const overviewCards = computed(() => {
  return [
    {
      key: 'total',
      label: '累计调用',
      value: formatCount(overview.value.totalCalls),
      valueClass: 'text-default',
    },
    {
      key: 'today',
      label: '今日调用',
      value: formatCount(overview.value.todayCalls),
      valueClass: 'text-default',
    },
    {
      key: 'yesterday',
      label: '昨日调用',
      value: formatCount(overview.value.yesterdayCalls),
      valueClass: 'text-default',
    },
    {
      key: 'successRate',
      label: '请求成功率',
      value: formatRate(overview.value.successRate),
      valueClass: 'text-default',
    },
    {
      key: 'success',
      label: '成功调用',
      value: formatCount(overview.value.successCalls),
      valueClass: 'text-default',
    },
    {
      key: 'failure',
      label: '失败调用',
      value: formatCount(overview.value.failureCalls),
      valueClass: 'text-default',
    },
    {
      key: 'users',
      label: '注册用户',
      value: formatCount(overview.value.userCount),
      valueClass: 'text-default',
    },
    {
      key: 'enabledStatsApis',
      label: '统计接口',
      value: formatCount(overview.value.enabledTrackedApiCount),
      valueClass: 'text-default',
    },
  ]
})
</script>

<template>
  <div>
    <CommonAppHeader />

    <main class="mx-auto max-w-275 px-5 pb-6">
      <div class="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-wide">
            公开调用统计
          </h2>
          <p class="mt-1 text-xs text-muted">
            包含调用概览、近7日趋势和近30日调用排行 TOP 10。更新时间：{{ generatedAtLabel }}
          </p>
        </div>

        <UButton
          variant="outline"
          size="sm"
          class="shrink-0 cursor-pointer"
          @click="reloadStats"
        >
          <Icon
            name="mdi:refresh"
            size="14"
            :ssr="true"
          />
          刷新数据
        </UButton>
      </div>

      <section
        v-if="showChallenge"
        class="state-panel bg-elevated border border-default rounded-xl p-6 text-center mb-6"
      >
        <div class="font-semibold mb-1">
          需要完成人机验证
        </div>
        <div class="text-muted text-[13px] mb-4">
          为防止恶意抓取，请先完成人机验证再查看统计数据。
        </div>
        <div class="flex justify-center">
          <CommonTurnstileWidget
            ref="turnstileWidget"
            v-model:token="turnstileToken"
            :site-key="turnstile.siteKey"
          />
        </div>
      </section>

      <section
        v-else-if="error"
        class="state-panel bg-elevated border border-default rounded-xl p-5 text-center mb-6"
      >
        <div class="font-semibold">
          统计加载失败
        </div>
        <div class="text-muted text-[13px] mt-1">
          请稍后重试。
        </div>
        <div class="mt-3">
          <UButton
            variant="outline"
            size="sm"
            class="cursor-pointer"
            @click="reloadStats"
          >
            重试
          </UButton>
        </div>
      </section>

      <section
        v-else-if="isInitialLoading"
        class="state-panel bg-elevated border border-default rounded-xl p-5 text-center mb-6"
      >
        加载统计中...
      </section>

      <template v-else-if="hasData">
        <section class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard
            v-for="item in overviewCards"
            :key="item.key"
            class="gap-2 border-default/90 py-4 shadow-sm"
          >
            <div class="px-4 pb-0">
              <p class="text-xs uppercase tracking-[0.14em] text-muted/90">
                {{ item.label }}
              </p>
              <h3
                class="mt-1 text-2xl tabular-nums"
                :class="item.valueClass"
              >
                {{ item.value }}
              </h3>
            </div>
          </UCard>
        </section>

        <section class="grid gap-6 xl:grid-cols-5">
          <UCard class="xl:col-span-3 py-4">
            <div class="px-4 pb-0">
              <h3>近7日趋势</h3>
              <p>按天聚合总调用、成功和失败</p>
            </div>
            <div class="px-4 pt-2">
              <ClientOnly>
                <div class="h-[320px] w-full">
                  <VisXYContainer
                    :data="trendChartData"
                    :padding="{ left: 8, right: 16, top: 20, bottom: 28 }"
                  >
                    <VisLine
                      :x="xAccessor"
                      :y="successLineAccessor"
                      color="var(--green)"
                      :line-width="2.5"
                    />
                    <VisLine
                      :x="xAccessor"
                      :y="failureLineAccessor"
                      color="var(--red)"
                      :line-width="2.5"
                    />
                    <VisAxis
                      type="y"
                      :tick-line="false"
                      :domain-line="false"
                      :grid-line="true"
                      :tick-format="yTickFormat"
                    />
                    <VisAxis
                      type="x"
                      :x="xAccessor"
                      :tick-line="false"
                      :domain-line="false"
                      :grid-line="false"
                      :tick-format="xTickFormat"
                      :num-ticks="7"
                    />
                  </VisXYContainer>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <div class="inline-flex items-center gap-2 rounded-full border border-default bg-muted/30 px-3 py-1 text-xs text-default/90">
                    <span class="h-2 w-2 rounded-full bg-[var(--green)]" />
                    成功次数
                  </div>
                  <div class="inline-flex items-center gap-2 rounded-full border border-default bg-muted/30 px-3 py-1 text-xs text-default/90">
                    <span class="h-2 w-2 rounded-full bg-[var(--red)]" />
                    失败次数
                  </div>
                </div>

                <template #fallback>
                  <div class="h-[320px] w-full rounded-lg border border-default bg-muted/20" />
                </template>
              </ClientOnly>
            </div>
          </UCard>

          <UCard class="xl:col-span-2 py-4">
            <div class="px-4 pb-0">
              <h3>近30日调用排行 TOP 10</h3>
              <p>按近 30 天调用总次数排序</p>
            </div>
            <div class="px-4 pt-2">
              <div
                v-if="top10Last30d.length === 0"
                class="h-[320px] rounded-lg border border-dashed border-default bg-muted/20 flex items-center justify-center text-sm text-muted"
              >
                近 30 天暂无调用数据
              </div>

              <table v-else>
                <thead>
                  <tr>
                    <th class="w-12">
                      排名
                    </th>
                    <th>接口</th>
                    <th class="text-right">
                      调用
                    </th>
                    <th class="text-right">
                      成功率
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in top10Last30d"
                    :key="item.apiId"
                  >
                    <td class="w-12 font-medium">
                      {{ item.rank }}
                    </td>
                    <td class="max-w-[280px]">
                      <div
                        class="font-medium truncate"
                        :title="item.name"
                      >
                        {{ item.name }}
                      </div>
                      <div
                        class="text-xs text-muted truncate mt-1"
                        :title="item.apiPath"
                      >
                        {{ item.apiPath }}
                      </div>
                      <UBadge
                        color="neutral"
                        variant="soft"
                        class="mt-1"
                      >
                        {{ formatMethod(item.httpMethod) }}
                      </UBadge>
                    </td>
                    <td class="text-right tabular-nums">
                      {{ item.totalCalls.toLocaleString() }}
                    </td>
                    <td class="text-right tabular-nums">
                      {{ formatRate(item.successRate) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </section>
      </template>
    </main>

    <CommonAppFooter />
  </div>
</template>
