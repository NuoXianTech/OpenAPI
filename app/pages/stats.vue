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
      successCalls: 0,
      failureCalls: 0,
      successRate: 0,
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
  totalCalls: {
    label: '总调用',
    color: 'var(--chart-1)',
  },
  successCalls: {
    label: '成功',
    color: 'var(--chart-2)',
  },
  failureCalls: {
    label: '失败',
    color: 'var(--chart-5)',
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

const yAccessors = [
  (item: TrendChartRow) => item.totalCalls,
  (item: TrendChartRow) => item.successCalls,
  (item: TrendChartRow) => item.failureCalls,
]

const lineColor = (_: TrendChartRow[], index: number) => {
  switch (index) {
    case 0:
      return 'var(--color-totalCalls)'
    case 1:
      return 'var(--color-successCalls)'
    default:
      return 'var(--color-failureCalls)'
  }
}

const xTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') {
    return ''
  }
  const index = Math.round(tick)
  return trendChartData.value[index]?.shortDate || ''
}

const yTickFormat = (tick: number | Date) => {
  if (typeof tick !== 'number') {
    return ''
  }
  return `${Math.round(tick)}`
}

const formatRate = (value: number) => `${value.toFixed(2)}%`

const formatMethod = (value: string) => {
  return value
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
    .join(' / ')
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <CommonAppHeader />

    <main class="max-w-[1200px] mx-auto px-5 pb-8">
      <section class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-wide text-text">
            公开调用统计
          </h1>
          <p class="text-sm text-muted mt-1">
            包含调用概览、近7日趋势和今日调用排行 TOP 10。更新时间：{{ generatedAtLabel }}
          </p>
        </div>

        <UiButton
          variant="outline"
          size="sm"
          :disabled="pending"
          @click="refresh"
        >
          {{ pending ? '刷新中...' : '刷新数据' }}
        </UiButton>
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
          <UiButton
            variant="outline"
            size="sm"
            @click="refresh"
          >
            重试
          </UiButton>
        </div>
      </section>

      <section
        v-else-if="isInitialLoading"
        class="state-panel bg-surface border border-border rounded-custom p-5 text-center mb-6"
      >
        加载统计中...
      </section>

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <UiCard class="gap-3 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardDescription>总调用次数</UiCardDescription>
              <UiCardTitle class="text-2xl">
                {{ overview.totalCalls.toLocaleString() }}
              </UiCardTitle>
            </UiCardHeader>
          </UiCard>

          <UiCard class="gap-3 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardDescription>成功调用</UiCardDescription>
              <UiCardTitle class="text-2xl text-green">
                {{ overview.successCalls.toLocaleString() }}
              </UiCardTitle>
            </UiCardHeader>
          </UiCard>

          <UiCard class="gap-3 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardDescription>失败调用</UiCardDescription>
              <UiCardTitle class="text-2xl text-red">
                {{ overview.failureCalls.toLocaleString() }}
              </UiCardTitle>
            </UiCardHeader>
          </UiCard>

          <UiCard class="gap-3 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardDescription>成功率 / 覆盖接口</UiCardDescription>
              <UiCardTitle class="text-2xl">
                {{ formatRate(overview.successRate) }}
              </UiCardTitle>
              <UiCardDescription>
                {{ overview.trackedApiCount }} 个接口
              </UiCardDescription>
            </UiCardHeader>
          </UiCard>
        </section>

        <section class="grid gap-6 xl:grid-cols-5">
          <UiCard class="xl:col-span-3 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardTitle>近7日趋势</UiCardTitle>
              <UiCardDescription>按天聚合总调用、成功和失败</UiCardDescription>
            </UiCardHeader>
            <UiCardContent class="px-4 pt-2">
              <ClientOnly>
                <UiChartContainer
                  :config="chartConfig"
                  class="h-[320px] w-full"
                >
                  <VisXYContainer
                    :data="trendChartData"
                    :padding="{ left: 8, right: 16, top: 20, bottom: 28 }"
                  >
                    <VisLine
                      :x="xAccessor"
                      :y="yAccessors"
                      :color="lineColor"
                      :line-width="2"
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

                  <UiChartLegendContent class="justify-start pt-4" />
                </UiChartContainer>

                <template #fallback>
                  <div class="h-[320px] w-full rounded-lg border border-border bg-muted/20" />
                </template>
              </ClientOnly>
            </UiCardContent>
          </UiCard>

          <UiCard class="xl:col-span-2 py-4">
            <UiCardHeader class="px-4 pb-0">
              <UiCardTitle>今日调用排行 TOP 10</UiCardTitle>
              <UiCardDescription>按今日调用总次数排序</UiCardDescription>
            </UiCardHeader>
            <UiCardContent class="px-4 pt-2">
              <div
                v-if="top10Today.length === 0"
                class="h-[320px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted"
              >
                今日暂无调用数据
              </div>

              <UiTable v-else>
                <UiTableHeader>
                  <UiTableRow>
                    <UiTableHead class="w-12">
                      排名
                    </UiTableHead>
                    <UiTableHead>接口</UiTableHead>
                    <UiTableHead class="text-right">
                      调用
                    </UiTableHead>
                    <UiTableHead class="text-right">
                      成功率
                    </UiTableHead>
                  </UiTableRow>
                </UiTableHeader>

                <UiTableBody>
                  <UiTableRow
                    v-for="item in top10Today"
                    :key="item.apiListId"
                  >
                    <UiTableCell class="w-12 font-medium">
                      {{ item.rank }}
                    </UiTableCell>
                    <UiTableCell class="max-w-[280px]">
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
                      <UiBadge
                        variant="secondary"
                        class="mt-1"
                      >
                        {{ formatMethod(item.httpMethod) }}
                      </UiBadge>
                    </UiTableCell>
                    <UiTableCell class="text-right tabular-nums">
                      {{ item.totalCalls.toLocaleString() }}
                    </UiTableCell>
                    <UiTableCell class="text-right tabular-nums">
                      {{ formatRate(item.successRate) }}
                    </UiTableCell>
                  </UiTableRow>
                </UiTableBody>
              </UiTable>
            </UiCardContent>
          </UiCard>
        </section>
      </template>
    </main>

    <CommonAppFooter />
  </div>
</template>
