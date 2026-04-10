<script setup lang="ts">
import type { ChartConfig } from '~/components/ui/chart'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsResponse,
} from '~~/shared/types/public-stats'
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'

interface TrendChartRow {
  index: number
  date: string
  shortDate: string
  totalCalls: number
  successCalls: number
  failureCalls: number
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
    top10Today: [],
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

  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

const EMPTY_DASHBOARD = createEmptyDashboard()

const chartConfig: ChartConfig = {
  successCalls: {
    label: '成功调用',
    color: 'var(--green)',
  },
  failureCalls: {
    label: '失败调用',
    color: 'var(--red)',
  },
}

const { data, pending, error, refresh } = await useAsyncData(
  'public-call-stats',
  () => $fetch<PublicCallStatsResponse>('/api/stats/public'),
  {
    default: () => ({
      code: 0,
      msg: '',
      data: createEmptyDashboard(),
      timestamp: Date.now(),
    }),
  },
)

const dashboard = computed(() => data.value?.data || EMPTY_DASHBOARD)
const overview = computed(() => dashboard.value.overview)
const trend7d = computed(() => dashboard.value.trend7d)
const top10Today = computed(() => dashboard.value.top10Today)
const isInitialLoading = computed(() => pending.value && trend7d.value.length === 0 && top10Today.value.length === 0)

const generatedAtLabel = computed(() => {
  const date = new Date(dashboard.value.generatedAt)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
})

const trendChartData = computed<TrendChartRow[]>(() => {
  return trend7d.value.map((item, index) => ({
    index,
    date: item.date,
    shortDate: toShortDate(item.date),
    totalCalls: item.totalCalls,
    successCalls: item.successCalls,
    failureCalls: item.failureCalls,
  }))
})

const xAccessor = (item: TrendChartRow) => item.index
const successLineAccessor = (item: TrendChartRow) => item.successCalls
const failureLineAccessor = (item: TrendChartRow) => item.failureCalls

const xTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') {
    return ''
  }
  const maxIndex = Math.max(trendChartData.value.length - 1, 0)
  const index = Math.min(maxIndex, Math.max(0, Math.floor(tick + Number.EPSILON)))
  return trendChartData.value[index]?.shortDate || ''
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
      valueClass: 'text-foreground',
    },
    {
      key: 'today',
      label: '今日调用',
      value: formatCount(overview.value.todayCalls),
      valueClass: 'text-foreground',
    },
    {
      key: 'yesterday',
      label: '昨日调用',
      value: formatCount(overview.value.yesterdayCalls),
      valueClass: 'text-foreground',
    },
    {
      key: 'successRate',
      label: '请求成功率',
      value: formatRate(overview.value.successRate),
      valueClass: 'text-foreground',
    },
    {
      key: 'success',
      label: '成功调用',
      value: formatCount(overview.value.successCalls),
      valueClass: 'text-foreground',
    },
    {
      key: 'failure',
      label: '失败调用',
      value: formatCount(overview.value.failureCalls),
      valueClass: 'text-foreground',
    },
    {
      key: 'users',
      label: '活跃用户',
      value: formatCount(overview.value.userCount),
      valueClass: 'text-foreground',
    },
    {
      key: 'enabledStatsApis',
      label: '统计接口',
      value: formatCount(overview.value.enabledTrackedApiCount),
      valueClass: 'text-foreground',
    },
  ]
})
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="mx-auto max-w-275 px-5 pb-8">
      <section class="flex items-end justify-between gap-4 py-6">
        <div>
          <h1 class="text-2xl font-semibold tracking-wide text-text">
            公开调用统计
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            包含调用概览、近7日趋势和今日调用排行 TOP 10。更新时间：{{ generatedAtLabel }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            as-child
            variant="outline"
            size="sm"
          >
            <NuxtLink to="/">
              <Icon
                name="mdi:home"
                size="14"
                :ssr="true"
              />
              返回首页
            </NuxtLink>
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="cursor-pointer"
            @click="refresh"
          >
            <Icon
              name="mdi:refresh"
              size="14"
              :ssr="true"
            />
            刷新数据
          </Button>
        </div>
      </section>

      <section
        v-if="error"
        class="state-panel bg-surface border border-border rounded-custom p-5 text-center mb-6"
      >
        <div class="font-semibold">
          统计加载失败
        </div>
        <div class="text-muted text-[13px] mt-1">
          请稍后重试。
        </div>
        <div class="mt-3">
          <Button
            variant="outline"
            size="sm"
            class="cursor-pointer"
            @click="refresh"
          >
            重试
          </Button>
        </div>
      </section>

      <section
        v-else-if="isInitialLoading"
        class="state-panel bg-surface border border-border rounded-custom p-5 text-center mb-6"
      >
        加载统计中...
      </section>

      <template v-else>
        <section class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            v-for="item in overviewCards"
            :key="item.key"
            class="gap-2 border-border/90 py-4 shadow-sm"
          >
            <CardHeader class="px-4 pb-0">
              <CardDescription class="text-xs uppercase tracking-[0.14em] text-muted-foreground/90">
                {{ item.label }}
              </CardDescription>
              <CardTitle
                class="mt-1 text-2xl tabular-nums"
                :class="item.valueClass"
              >
                {{ item.value }}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section class="grid gap-6 xl:grid-cols-5">
          <Card class="xl:col-span-3 py-4">
            <CardHeader class="px-4 pb-0">
              <CardTitle>近7日趋势</CardTitle>
              <CardDescription>按天聚合总调用、成功和失败</CardDescription>
            </CardHeader>
            <CardContent class="px-4 pt-2">
              <ClientOnly>
                <ChartContainer
                  :config="chartConfig"
                  class="h-[320px] w-full"
                >
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
                      :tick-format="yTickFormat"
                    />
                    <VisAxis
                      type="x"
                      :x="xAccessor"
                      :tick-format="xTickFormat"
                      :num-ticks="7"
                    />
                  </VisXYContainer>
                </ChartContainer>

                <div class="mt-4 flex flex-wrap gap-2">
                  <div class="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-foreground/90">
                    <span class="h-2 w-2 rounded-full bg-[var(--green)]" />
                    成功调用
                  </div>
                  <div class="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-foreground/90">
                    <span class="h-2 w-2 rounded-full bg-[var(--red)]" />
                    失败调用
                  </div>
                </div>

                <template #fallback>
                  <div class="h-[320px] w-full rounded-lg border border-border bg-muted/20" />
                </template>
              </ClientOnly>
            </CardContent>
          </Card>

          <Card class="xl:col-span-2 py-4">
            <CardHeader class="px-4 pb-0">
              <CardTitle>今日调用排行 TOP 10</CardTitle>
              <CardDescription>按今日调用总次数排序</CardDescription>
            </CardHeader>
            <CardContent class="px-4 pt-2">
              <div
                v-if="top10Today.length === 0"
                class="h-[320px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted"
              >
                今日暂无调用数据
              </div>

              <Table v-else>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-12">
                      排名
                    </TableHead>
                    <TableHead>接口</TableHead>
                    <TableHead class="text-right">
                      调用
                    </TableHead>
                    <TableHead class="text-right">
                      成功率
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow
                    v-for="item in top10Today"
                    :key="item.apiListId"
                  >
                    <TableCell class="w-12 font-medium">
                      {{ item.rank }}
                    </TableCell>
                    <TableCell class="max-w-[280px]">
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
                      <Badge
                        variant="secondary"
                        class="mt-1"
                      >
                        {{ formatMethod(item.httpMethod) }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ item.totalCalls.toLocaleString() }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ formatRate(item.successRate) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </template>
    </main>

    <CommonAppFooter />
  </div>
</template>
