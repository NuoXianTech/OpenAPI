<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogItem } from '#shared/types/api'
import type { PublicCallStatsDashboard } from '#shared/types/public-stats'
import { usePublicApiCatalog } from '~/composables/api/use-public-api-catalog'

const {
  categoryMap,
  allApis,
  isLoading,
  loadError,
  refreshCatalog
} = usePublicApiCatalog()

const { settings } = useSiteSettings()
const {
  data: publicStats,
  pending: publicStatsLoading,
  error: publicStatsError
} = useFetch<PublicCallStatsDashboard>('/api/stats/public', {
  key: 'home-public-stats'
})

const introMetrics = computed(() => {
  const apis = allApis.value
  const total = apis.length
  const available = apis.filter(api => api.status === API_STATUS.normal).length

  return {
    total,
    availabilityRate: total > 0 ? Number((available / total * 100).toFixed(2)) : 0,
    calls: publicStats.value?.overview.totalCalls
      ?? apis.reduce((sum, api) => sum + (Number(api.totalCalls) || 0), 0),
    successRate: publicStats.value?.overview.successRate ?? 0,
    users: publicStats.value?.overview.userCount ?? 0
  }
})

const popularApis = computed<ApiCatalogItem[]>(() => {
  const apiById = new Map(allApis.value.map(api => [api.id, api]))
  const selectedApis: ApiCatalogItem[] = []
  const selectedApiIds = new Set<number>()

  for (const rankingEntry of publicStats.value?.rankingLast30d ?? []) {
    const api = apiById.get(rankingEntry.apiId)
    if (!api || selectedApiIds.has(api.id)) continue
    selectedApis.push(api)
    selectedApiIds.add(api.id)
    if (selectedApis.length === 6) return selectedApis
  }

  const fallbackApis = [...allApis.value]
    .filter(api => !selectedApiIds.has(api.id))
    .sort((left, right) => right.totalCalls - left.totalCalls || left.id - right.id)

  return [...selectedApis, ...fallbackApis].slice(0, 6)
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
      :total-count="introMetrics.total"
      :availability-rate="introMetrics.availabilityRate"
      :call-count="introMetrics.calls"
      :success-rate="introMetrics.successRate"
      :user-count="introMetrics.users"
      :summary-loading="isLoading || publicStatsLoading"
      :summary-error="!!loadError || !!publicStatsError"
    />

    <main>
      <HomePopularApis
        :apis="popularApis"
        :category-map="categoryMap"
        :total-api-count="allApis.length"
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
