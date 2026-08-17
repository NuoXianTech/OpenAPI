<script setup lang="ts">
import type { ApiCatalogItem } from '#shared/types/api'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsSummary
} from '#shared/types/public-stats'
import { usePublicApiCatalog } from '~/composables/api/use-public-api-catalog'

const LIVE_STATS_REFRESH_INTERVAL_MS = 10_000
const POPULAR_API_LIMIT = 6

const {
  categoryMap,
  allApis,
  isLoading,
  loadError,
  refreshCatalog,
  total: totalApiCount
} = usePublicApiCatalog({ pageSize: 100 })

const { settings } = useSiteSettings()
const {
  data: publicStats,
  pending: publicStatsLoading,
  error: publicStatsError
} = useFetch<PublicCallStatsDashboard>('/api/stats/public', {
  key: 'home-public-stats',
  query: {
    days: 1,
    top: POPULAR_API_LIMIT
  }
})
const liveStats = shallowRef<PublicCallStatsSummary | null>(null)
let liveStatsRefreshTimer: ReturnType<typeof setInterval> | undefined
let liveStatsRefreshPending = false

const introSummaryLoading = computed(() =>
  isLoading.value || (publicStatsLoading.value && !liveStats.value)
)
const introSummaryError = computed(() =>
  Boolean(loadError.value) || (Boolean(publicStatsError.value) && !liveStats.value)
)

async function refreshLiveStats(): Promise<void> {
  if (liveStatsRefreshPending || document.visibilityState !== 'visible') return

  liveStatsRefreshPending = true
  try {
    liveStats.value = await $fetch<PublicCallStatsSummary>('/api/stats/public/summary')
  } catch {
    // Background refreshes keep the last valid snapshot on transient failures.
  } finally {
    liveStatsRefreshPending = false
  }
}

onMounted(() => {
  if (publicStatsError.value) void refreshLiveStats()

  liveStatsRefreshTimer = setInterval(() => {
    void refreshLiveStats()
  }, LIVE_STATS_REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (liveStatsRefreshTimer) clearInterval(liveStatsRefreshTimer)
})

const introMetrics = computed(() => {
  const apis = allApis.value
  const total = totalApiCount.value

  return {
    total,
    calls: liveStats.value?.totalCalls
      ?? publicStats.value?.overview.totalCalls
      ?? apis.reduce((sum, api) => sum + (Number(api.totalCalls) || 0), 0),
    successRate: liveStats.value?.successRate
      ?? publicStats.value?.overview.successRate
      ?? 0,
    users: liveStats.value?.userCount
      ?? publicStats.value?.overview.userCount
      ?? 0
  }
})

const popularApis = computed<ApiCatalogItem[]>(() => {
  const apiByRouteId = new Map(allApis.value.flatMap(api => (
    api.endpoints.map(endpoint => [endpoint.id, api] as const)
  )))
  const selectedApis: ApiCatalogItem[] = []
  const selectedApiIds = new Set<string>()

  for (const rankingEntry of publicStats.value?.rankingLast30d ?? []) {
    const api = apiByRouteId.get(rankingEntry.routeId)
    if (!api || selectedApiIds.has(api.id)) continue
    selectedApis.push(api)
    selectedApiIds.add(api.id)
    if (selectedApis.length === POPULAR_API_LIMIT) return selectedApis
  }

  const fallbackApis = [...allApis.value]
    .filter(api => !selectedApiIds.has(api.id))
    .sort((left, right) => (
      right.totalCalls - left.totalCalls
      || left.name.localeCompare(right.name)
    ))

  return [...selectedApis, ...fallbackApis].slice(0, POPULAR_API_LIMIT)
})

useSeoMeta({
  ogTitle: () => settings.value.siteName,
  description: () => settings.value.siteDescription,
  ogDescription: () => settings.value.siteDescription,
  ogType: 'website',
  ogImage: () => settings.value.siteImg
})
</script>

<template>
  <div class="public-page">
    <CommonSiteHeader />
    <CommonPublicApiIntro
      :site-description="settings.siteDescription"
      :uptime-days="settings.uptimeDays"
      :total-count="introMetrics.total"
      :call-count="introMetrics.calls"
      :success-rate="introMetrics.successRate"
      :user-count="introMetrics.users"
      :summary-loading="introSummaryLoading"
      :summary-error="introSummaryError"
    />

    <main>
      <HomePopularApis
        :apis="popularApis"
        :category-map="categoryMap"
        :total-api-count="totalApiCount"
        :is-loading="isLoading"
        :load-error="loadError"
        @retry="refreshCatalog"
      />
      <HomeApiOnboarding />
    </main>

    <CommonAppFooter />
    <Suspense>
      <LazyCommonAnnouncementPopup />
      <template #fallback>
        <span class="sr-only">{{ $t('public.home.announcementLoading') }}</span>
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100dvh;
  background: var(--ui-bg);
}
</style>
