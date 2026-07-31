<script setup lang="ts">
import { useApiList } from '~/composables/api/use-api-list'
import { useClientPagination } from '~/composables/dashboard/use-client-pagination'
import { API_STATUS } from '#shared/config/api-status'

const { t } = useI18n()

const {
  query,
  currentTab,
  currentCategory,
  statusTabs,
  categoryTabs,
  allItems,
  loading,
  error,
  filteredItems,
  isEmpty,
  fetchList
} = useApiList()

const { settings } = useSiteSettings()

const {
  page,
  pageSize,
  total,
  totalPages,
  paginated: paginatedItems
} = useClientPagination(filteredItems, 13)

watch([query, currentTab, currentCategory], () => {
  page.value = 1
})

const hasPagination = computed(() => total.value > pageSize.value)
const retryActions = computed(() => [{
  label: t('common.actions.retry'),
  color: 'neutral' as const,
  variant: 'outline' as const,
  icon: 'i-mdi-refresh',
  onClick: fetchList
}])

const heroStats = computed(() => ({
  total: allItems.value.length,
  normal: allItems.value.filter((i: { status: number }) => i.status === API_STATUS.normal).length,
  calls: allItems.value.reduce((sum: number, item: { totalCalls?: number }) => sum + (Number(item.totalCalls) || 0), 0)
}))

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
    <CommonHomeHero
      :start-time="settings.startTime"
      :site-name="settings.siteName"
      :site-description="settings.siteDescription"
      :total-count="heroStats.total"
      :normal-count="heroStats.normal"
      :call-count="heroStats.calls"
      :api-list-loading="loading"
      :api-list-error="!!error"
    />

    <main id="api-catalog" class="catalog-shell">
      <header class="catalog-heading">
        <div>
          <div class="catalog-heading__kicker">
            API CATALOG
          </div>
          <h2>{{ $t('public.navigation.catalog') }}</h2>
          <p>{{ $t('public.home.catalogDescription') }}</p>
        </div>
        <div class="catalog-heading__count">
          <strong>{{ total }}</strong>
          <span>{{ $t('public.home.totalApis') }}</span>
        </div>
      </header>

      <section class="catalog-controls" :aria-label="$t('public.home.statusFilterAria')">
        <div class="catalog-search">
          <CommonSearchBar v-model="query" size="lg" />
        </div>
        <div class="catalog-filter">
          <span class="catalog-filter__label">
            <UIcon name="i-mdi-pulse" class="size-3.5" />
            {{ $t('public.home.statusFilter') }}
          </span>
          <CommonFilterTabs
            v-model="currentTab"
            :tabs="statusTabs"
            :enable-collapse="false"
            :aria-label="t('public.home.statusFilterAria')"
          />
        </div>
        <div class="catalog-filter catalog-filter--wide">
          <span class="catalog-filter__label">
            <UIcon name="i-mdi-shape-outline" class="size-3.5" />
            {{ $t('public.home.categoryFilter') }}
          </span>
          <CommonFilterTabs
            v-model="currentCategory"
            :tabs="categoryTabs"
            :max-visible="10"
            :search-placeholder="t('public.home.categorySearch')"
            :empty-text="t('public.home.categoryEmpty')"
            :aria-label="t('public.home.categoryFilterAria')"
          />
        </div>
      </section>

      <Transition
        name="state-fade"
        mode="out-in"
      >
        <section
          v-if="loading"
          id="loadingState"
          key="loading"
          class="py-8"
        >
          <UEmpty
            icon="i-mdi-loading"
            :title="t('common.states.loading')"
            :description="t('public.home.loadingDescription')"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else-if="error"
          id="errorState"
          key="error"
          class="py-2"
        >
          <UEmpty
            icon="i-mdi-alert-circle-outline"
            :title="t('common.states.loadFailed')"
            :description="error"
            variant="naked"
            size="lg"
            :actions="retryActions"
          />
        </section>

        <section
          v-else-if="isEmpty"
          id="emptyState"
          key="empty"
          class="py-2"
        >
          <UEmpty
            icon="i-mdi-magnify-close"
            :title="t('public.home.emptyTitle')"
            :description="t('public.home.emptyDescription')"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else
          id="contentState"
          key="content"
          class="pt-5"
        >
          <div class="catalog-result-meta">
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-3.5"
              />
              {{ $t('public.home.totalCount', { count: total }) }}
            </span>
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-cursor-default-click-outline"
                class="size-3.5"
              />
              {{ $t('public.home.clickHint') }}
            </span>
          </div>
          <ApiList
            :items="paginatedItems"
          />
          <div
            v-if="hasPagination"
            class="mt-6 flex flex-col items-center justify-between gap-3 border-t border-default pt-5 sm:flex-row"
          >
            <span class="text-xs text-muted tabular-nums">
              {{ $t('public.home.pagination', { page, totalPages }) }}
            </span>
            <UPagination
              v-model:page="page"
              :items-per-page="pageSize"
              :total="total"
              :sibling-count="1"
              size="sm"
            />
          </div>
        </section>
      </Transition>
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
.public-page { min-height: 100dvh; background: var(--ui-bg); }

.catalog-shell {
  width: calc(100% - 2rem);
  max-width: 1180px;
  margin-inline: auto;
  padding-block: 4.5rem 1rem;
  scroll-margin-top: 5rem;
}

.catalog-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.catalog-heading__kicker {
  margin-bottom: 0.35rem;
  color: var(--ui-text-muted);
  font-family: var(--font-code);
  font-size: 0.65rem;
  font-weight: 700;
}

.catalog-heading h2 {
  color: var(--ui-text-highlighted);
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  font-weight: 650;
}

.catalog-heading p {
  max-width: 36rem;
  margin-top: 0.45rem;
  color: var(--ui-text-muted);
  font-size: 0.85rem;
  line-height: 1.65;
}

.catalog-heading__count {
  display: none;
  min-width: 5rem;
  flex-direction: column;
  align-items: flex-end;
}

.catalog-heading__count strong { font-family: var(--font-code); font-size: 1.5rem; }
.catalog-heading__count span { color: var(--ui-text-dimmed); font-size: 0.68rem; }

.catalog-controls {
  display: grid;
  gap: 1rem;
}

.catalog-search,
.catalog-filter { min-width: 0; }

.catalog-filter__label {
  display: inline-flex;
  margin-bottom: 0.45rem;
  align-items: center;
  gap: 0.35rem;
  color: var(--ui-text-dimmed);
  font-family: var(--font-code);
  font-size: 0.62rem;
  font-weight: 650;
  text-transform: uppercase;
}

.catalog-result-meta {
  display: flex;
  margin-bottom: 0.75rem;
  align-items: center;
  justify-content: space-between;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
}

@media (width >= 640px) {
  .catalog-heading__count { display: flex; }
}

@media (width >= 960px) {
  .catalog-controls { grid-template-columns: minmax(260px, 0.78fr) minmax(240px, 0.58fr) minmax(0, 1.5fr); }
}
</style>
