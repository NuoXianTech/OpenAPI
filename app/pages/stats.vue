<script setup lang="ts">
import type { PublicCallStatsDashboard } from '~~/shared/types/public-stats'

useHead({ title: '数据统计' })
useSeoMeta({
  description: '公开 API 调用统计：累计调用次数、成功率、近 7 日趋势及调用排行。',
  ogTitle: '调用统计',
  ogDescription: '公开 API 调用统计：累计调用次数、成功率、近 7 日趋势及调用排行。'
})

definePageMeta({ layout: false })

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

const SUCCESS_KEY = '成功次数' as const
const FAILURE_KEY = '失败次数' as const

const data = ref<PublicCallStatsDashboard | null>(null)
const pending = ref(false)
const error = ref<unknown>(null)

const fetchStats = async () => {
  pending.value = true
  error.value = null
  try {
    data.value = await $fetch<PublicCallStatsDashboard>('/api/stats/public')
  } catch (err) {
    error.value = err
  } finally {
    pending.value = false
  }
}

const reloadStats = async () => {
  error.value = null
  await fetchStats()
}

onMounted(() => {
  fetchStats()
})

const overview = computed(() => data.value?.overview ?? null)
const trend7d = computed(() => data.value?.trend7d ?? [])
const top10Last30d = computed(() => data.value?.top10Last30d ?? [])
const hasData = computed(() => data.value !== null)
const isInitialLoading = computed(() => pending.value && !hasData.value)

// 没数据时不显示"更新时间"，避免 1970-01-01 这种 placeholder 时间被渲染出来
const generatedAtLabel = computed(() => {
  if (!data.value?.generatedAt) {
    return ''
  }
  const date = new Date(data.value.generatedAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString('zh-CN', { hour12: false })
})

const trendChartData = computed<TrendChartRow[]>(() => {
  return trend7d.value.map(item => ({
    label: toShortDate(item.date),
    [SUCCESS_KEY]: item.successCalls,
    [FAILURE_KEY]: item.failureCalls
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
  if (!overview.value) {
    return []
  }
  return [
    { key: 'total', label: '累计调用', value: formatCount(overview.value.totalCalls), icon: 'i-mdi-counter' },
    { key: 'today', label: '今日调用', value: formatCount(overview.value.todayCalls), icon: 'i-mdi-calendar-today-outline' },
    { key: 'yesterday', label: '昨日调用', value: formatCount(overview.value.yesterdayCalls), icon: 'i-mdi-calendar-arrow-left' },
    { key: 'successRate', label: '请求成功率', value: formatRate(overview.value.successRate), icon: 'i-mdi-chart-donut' },
    { key: 'success', label: '成功调用', value: formatCount(overview.value.successCalls), icon: 'i-mdi-check-circle-outline' },
    { key: 'failure', label: '失败调用', value: formatCount(overview.value.failureCalls), icon: 'i-mdi-close-circle-outline' },
    { key: 'users', label: '注册用户', value: formatCount(overview.value.userCount), icon: 'i-mdi-account-group-outline' },
    { key: 'enabledStatsApis', label: '统计接口', value: formatCount(overview.value.enabledTrackedApiCount), icon: 'i-mdi-api' }
  ]
})
</script>

<template>
  <UPage class="mx-auto max-w-7xl px-4 sm:px-6 py-8">
    <UPageHeader
      headline="公开数据"
      title="OpenAPI 调用统计"
      description="实时聚合的接口调用情况，可作为服务可用性与活跃度的参考"
    >
      <template #links>
        <UButton
          icon="i-mdi-refresh"
          variant="outline"
          color="neutral"
          size="sm"
          :loading="pending"
          @click="reloadStats"
        >
          刷新
        </UButton>
        <UButton
          icon="i-mdi-home-outline"
          variant="outline"
          color="neutral"
          size="sm"
          to="/"
        >
          返回首页
        </UButton>
      </template>
    </UPageHeader>

    <UPageBody>
      <p
        v-if="generatedAtLabel"
        class="text-xs text-muted -mt-2 mb-4"
      >
        更新时间：{{ generatedAtLabel }}
      </p>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-mdi-alert-circle-outline"
        title="统计加载失败"
        description="请稍后重试，或检查网络连接。"
        class="mb-6"
        :actions="[{ label: '重试', color: 'neutral', variant: 'outline', onClick: reloadStats }]"
      />

      <div
        v-else-if="isInitialLoading"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6"
      >
        <USkeleton
          v-for="n in 8"
          :key="n"
          class="h-24 w-full rounded-lg"
        />
      </div>

      <template v-else-if="hasData">
        <UPageGrid class="mb-6 sm:grid-cols-2 lg:grid-cols-4">
          <UPageCard
            v-for="item in overviewCards"
            :key="item.key"
            :icon="item.icon"
            :title="item.value"
            :description="item.label"
            variant="subtle"
            class="text-center sm:text-left [&_h3]:tabular-nums"
          />
        </UPageGrid>

        <div class="grid gap-6 xl:grid-cols-5">
          <UCard class="xl:col-span-3">
            <template #header>
              <h3 class="text-base font-semibold text-highlighted">
                近 7 日趋势
              </h3>
              <p class="text-sm text-muted mt-0.5">
                按天聚合成功与失败调用次数
              </p>
            </template>

            <ClientOnly>
              <div class="h-[320px] w-full">
                <VisXYContainer
                  :data="trendChartData"
                  :padding="{ left: 8, right: 16, top: 20, bottom: 28 }"
                >
                  <VisLine
                    :x="xAccessor"
                    :y="successLineAccessor"
                    color="var(--ui-success)"
                    :line-width="2.5"
                  />
                  <VisLine
                    :x="xAccessor"
                    :y="failureLineAccessor"
                    color="var(--ui-error)"
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
                <UBadge
                  variant="soft"
                  color="success"
                  icon="i-mdi-circle"
                >
                  成功次数
                </UBadge>
                <UBadge
                  variant="soft"
                  color="error"
                  icon="i-mdi-circle"
                >
                  失败次数
                </UBadge>
              </div>

              <template #fallback>
                <div class="h-[320px] w-full rounded-lg bg-elevated/50" />
              </template>
            </ClientOnly>
          </UCard>

          <UCard class="xl:col-span-2">
            <template #header>
              <h3 class="text-base font-semibold text-highlighted">
                近 30 日调用排行 TOP 10
              </h3>
              <p class="text-sm text-muted mt-0.5">
                按近 30 天调用总次数排序
              </p>
            </template>

            <UEmpty
              v-if="top10Last30d.length === 0"
              icon="i-mdi-chart-bar"
              title="暂无调用数据"
              description="近 30 天还没有任何接口调用记录。"
              class="h-[320px]"
            />

            <ol
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="item in top10Last30d"
                :key="item.apiId"
                class="flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-elevated/40 rounded-md -mx-2 px-2"
              >
                <UBadge
                  :color="item.rank <= 3 ? 'primary' : 'neutral'"
                  :variant="item.rank <= 3 ? 'solid' : 'soft'"
                  class="w-7 justify-center tabular-nums shrink-0"
                >
                  {{ item.rank }}
                </UBadge>
                <div class="min-w-0 flex-1">
                  <div
                    class="font-medium truncate text-default"
                    :title="item.name"
                  >
                    {{ item.name }}
                  </div>
                  <div
                    class="text-xs text-muted truncate font-mono"
                    :title="item.apiPath"
                  >
                    {{ item.apiPath }}
                  </div>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    class="mt-1"
                  >
                    {{ formatMethod(item.httpMethod) }}
                  </UBadge>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-sm font-semibold tabular-nums text-highlighted">
                    {{ formatCount(item.totalCalls) }}
                  </div>
                  <div class="text-xs text-muted tabular-nums">
                    {{ formatRate(item.successRate) }}
                  </div>
                </div>
              </li>
            </ol>
          </UCard>
        </div>
      </template>
    </UPageBody>

    <CommonAppFooter />
  </UPage>
</template>
