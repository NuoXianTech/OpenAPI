import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsOverview,
  PublicCallStatsTrendPoint
} from '#shared/types/public-stats'
import type { DashboardCallRankItem } from '#shared/types/dashboard'
import { formatCompactCount, formatCount, formatPercent } from '~/utils/number-format'

type PublicStatTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'

interface PublicStatsOverviewCard {
  key: string
  label: string
  value: string
  helper: string
  icon: string
  tone: PublicStatTone
  accent: string
}

interface UsePublicStatsDashboardReturn {
  data: Ref<PublicCallStatsDashboard | null>
  isPending: Ref<boolean>
  error: Ref<unknown>
  overview: ComputedRef<PublicCallStatsOverview | null>
  trend7d: ComputedRef<PublicCallStatsTrendPoint[]>
  rankingLast30d: ComputedRef<DashboardCallRankItem[]>
  hasData: ComputedRef<boolean>
  isInitialLoading: ComputedRef<boolean>
  generatedAtLabel: ComputedRef<string>
  todayDelta: ComputedRef<number>
  todayDeltaTone: ComputedRef<PublicStatTone>
  todayDeltaLabel: ComputedRef<string>
  successRateProgress: ComputedRef<number>
  failureRate: ComputedRef<number>
  trackedApiRatio: ComputedRef<number>
  trackedApiRatioLabel: ComputedRef<string>
  trendTotalCalls: ComputedRef<number>
  trendSuccessCalls: ComputedRef<number>
  trendFailureCalls: ComputedRef<number>
  topApi: ComputedRef<DashboardCallRankItem | null>
  overviewCards: ComputedRef<PublicStatsOverviewCard[]>
  fetchStats: () => Promise<void>
  reloadStats: () => Promise<void>
  formatRate: (value: number) => string
  formatCount: (value: number) => string
  formatCompact: (value: number) => string
}

interface UsePublicStatsDashboardOptions {
  immediate?: boolean
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2))
}

export function usePublicStatsDashboard(options: UsePublicStatsDashboardOptions = {}): UsePublicStatsDashboardReturn {
  const data = ref<PublicCallStatsDashboard | null>(null)
  const isPending = ref(false)
  const error = ref<unknown>(null)

  const overview = computed(() => data.value?.overview ?? null)
  const trend7d = computed(() => data.value?.trend7d ?? [])
  const rankingLast30d = computed(() => data.value?.rankingLast30d ?? [])
  const hasData = computed(() => data.value !== null)
  const isInitialLoading = computed(() => isPending.value && !hasData.value)

  const generatedAtLabel = computed(() => {
    if (!data.value?.generatedAt) return ''
    const date = new Date(data.value.generatedAt)
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('zh-CN', { hour12: false })
  })

  const todayDelta = computed(() => {
    if (!overview.value) return 0
    return overview.value.todayCalls - overview.value.yesterdayCalls
  })

  const todayDeltaTone = computed<PublicStatTone>(() => {
    if (todayDelta.value > 0) return 'success'
    if (todayDelta.value < 0) return 'warning'
    return 'neutral'
  })

  const todayDeltaLabel = computed(() => {
    if (!overview.value) return '等待统计同步'
    if (todayDelta.value === 0) return '较昨日持平'
    const prefix = todayDelta.value > 0 ? '+' : ''
    return `较昨日 ${prefix}${formatCount(todayDelta.value)}`
  })

  const successRateProgress = computed(() => roundPercent(clampPercent(overview.value?.successRate ?? 0)))
  const failureRate = computed(() => roundPercent(clampPercent(100 - successRateProgress.value)))
  const trackedApiRatio = computed(() => {
    if (!overview.value?.trackedApiCount) return 0
    return roundPercent(clampPercent((overview.value.enabledTrackedApiCount / overview.value.trackedApiCount) * 100))
  })

  const trackedApiRatioLabel = computed(() => {
    if (!overview.value?.trackedApiCount) return '暂无接口纳入统计'
    return `${formatPercent(trackedApiRatio.value)} 已启用`
  })

  const trendTotalCalls = computed(() => trend7d.value.reduce((sum, item) => sum + item.totalCalls, 0))
  const trendSuccessCalls = computed(() => trend7d.value.reduce((sum, item) => sum + item.successCalls, 0))
  const trendFailureCalls = computed(() => trend7d.value.reduce((sum, item) => sum + item.failureCalls, 0))

  const topApi = computed(() => rankingLast30d.value[0] ?? null)

  const overviewCards = computed<PublicStatsOverviewCard[]>(() => {
    if (!overview.value) return []

    return [
      {
        key: 'total',
        label: '累计调用',
        value: formatCount(overview.value.totalCalls),
        helper: '全站历史请求总量',
        icon: 'i-mdi-counter',
        tone: 'primary',
        accent: 'var(--ui-primary)'
      },
      {
        key: 'today',
        label: '今日调用',
        value: formatCount(overview.value.todayCalls),
        helper: todayDeltaLabel.value,
        icon: 'i-mdi-calendar-today-outline',
        tone: todayDeltaTone.value,
        accent: 'var(--ui-info)'
      },
      {
        key: 'yesterday',
        label: '昨日调用',
        value: formatCount(overview.value.yesterdayCalls),
        helper: '自然日聚合',
        icon: 'i-mdi-calendar-arrow-left',
        tone: 'neutral',
        accent: 'var(--ui-text-muted)'
      },
      {
        key: 'successRate',
        label: '请求成功率',
        value: formatPercent(overview.value.successRate),
        helper: `失败率 ${formatPercent(failureRate.value)}`,
        icon: 'i-mdi-chart-donut',
        tone: 'success',
        accent: 'var(--ui-success)'
      },
      {
        key: 'success',
        label: '成功调用',
        value: formatCount(overview.value.successCalls),
        helper: 'HTTP 成功响应',
        icon: 'i-mdi-check-circle-outline',
        tone: 'success',
        accent: 'var(--ui-success)'
      },
      {
        key: 'failure',
        label: '失败调用',
        value: formatCount(overview.value.failureCalls),
        helper: overview.value.failureCalls > 0 ? '需要关注的异常请求' : '暂无失败记录',
        icon: 'i-mdi-close-circle-outline',
        tone: overview.value.failureCalls > 0 ? 'error' : 'neutral',
        accent: 'var(--ui-error)'
      },
      {
        key: 'users',
        label: '注册用户',
        value: formatCount(overview.value.userCount),
        helper: '平台账户规模',
        icon: 'i-mdi-account-group-outline',
        tone: 'info',
        accent: 'var(--ui-info)'
      },
      {
        key: 'enabledStatsApis',
        label: '统计接口',
        value: formatCount(overview.value.enabledTrackedApiCount),
        helper: trackedApiRatioLabel.value,
        icon: 'i-mdi-api',
        tone: 'primary',
        accent: 'var(--ui-primary)'
      }
    ]
  })

  async function fetchStats() {
    isPending.value = true
    error.value = null
    try {
      data.value = await $fetch<PublicCallStatsDashboard>('/api/stats/public')
    } catch (err) {
      error.value = err
    } finally {
      isPending.value = false
    }
  }

  async function reloadStats() {
    error.value = null
    await fetchStats()
  }

  if (options.immediate ?? true) {
    onMounted(() => {
      void fetchStats()
    })
  }

  return {
    data,
    isPending,
    error,
    overview,
    trend7d,
    rankingLast30d,
    hasData,
    isInitialLoading,
    generatedAtLabel,
    todayDelta,
    todayDeltaTone,
    todayDeltaLabel,
    successRateProgress,
    failureRate,
    trackedApiRatio,
    trackedApiRatioLabel,
    trendTotalCalls,
    trendSuccessCalls,
    trendFailureCalls,
    topApi,
    overviewCards,
    fetchStats,
    reloadStats,
    formatRate: formatPercent,
    formatCount,
    formatCompact: formatCompactCount
  }
}
