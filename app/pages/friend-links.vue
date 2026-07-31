<script setup lang="ts">
import { useFriendLinkList } from '~/composables/link/use-friend-link-list'

const { t } = useI18n()
useHead(() => ({ title: t('public.friendLinks.title') }))
useSeoMeta({
  description: () => t('public.friendLinks.seoDescription'),
  ogTitle: () => t('public.friendLinks.title'),
  ogDescription: () => t('public.friendLinks.seoDescription')
})

const query = ref('')
const currentStatus = ref<string | number>('all')

const statusTabs = computed(() => [
  { label: t('common.filters.all'), value: 'all' },
  { label: t('common.states.active'), value: 1 },
  { label: t('common.states.inactive'), value: 0 }
])

const retryActions = computed(() => [{
  label: t('common.actions.retry'),
  color: 'neutral' as const,
  variant: 'outline' as const,
  icon: 'i-mdi-refresh',
  onClick: fetchFriendLinks
}])

const {
  items,
  loading,
  error,
  isEmpty,
  fetchFriendLinks
} = useFriendLinkList()

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return items.value.filter((item) => {
    const keywordMatched = !keyword
      || item.title.toLowerCase().includes(keyword)
      || (item.description || '').toLowerCase().includes(keyword)
      || item.url.toLowerCase().includes(keyword)

    const statusMatched = currentStatus.value === 'all'
      || Number(item.isActive) === Number(currentStatus.value)

    return keywordMatched && statusMatched
  })
})

const isFilteredEmpty = computed(() => !loading.value && !error.value && filteredItems.value.length === 0 && items.value.length > 0)

const totalCount = computed(() => items.value.length)
const activeCount = computed(() => items.value.filter(item => item.isActive).length)
const visibleCount = computed(() => filteredItems.value.length)
</script>

<template>
  <div class="public-page">
    <CommonSiteHeader />
    <main class="mx-auto w-full max-w-275 flex-1 px-5 pt-5 pb-6 sm:pt-6">
      <CommonFriendLinksHero
        :total-count="totalCount"
        :active-count="activeCount"
      />

      <UCard
        class="friend-filter-card"
        :ui="{ root: 'mb-4 overflow-hidden', body: 'p-0 sm:p-0' }"
        variant="subtle"
      >
        <div class="border-b border-default px-4 py-3 sm:px-5">
          <CommonSearchBar
            v-model="query"
            :placeholder="t('public.friendLinks.searchPlaceholder')"
            class="!mt-0 !mb-0"
          />
        </div>

        <div class="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(220px,0.48fr)_1fr]">
          <div class="px-4 py-3.5 sm:px-5 lg:border-r lg:border-default lg:py-4">
            <div class="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <UIcon
                name="i-mdi-filter-variant"
                class="size-3"
              />
              {{ $t('public.friendLinks.statusFilter') }}
            </div>
            <CommonFilterTabs
              v-model="currentStatus"
              :tabs="statusTabs"
              :enable-collapse="false"
              :aria-label="t('public.friendLinks.statusFilterAria')"
            />
          </div>

          <div class="border-t border-default px-4 py-3.5 sm:px-5 lg:border-t-0 lg:py-4">
            <dl class="friend-filter-summary">
              <div>
                <dt>{{ $t('common.filters.all') }}</dt>
                <dd>{{ totalCount }}</dd>
              </div>
              <div>
                <dt>{{ $t('common.states.active') }}</dt>
                <dd>{{ activeCount }}</dd>
              </div>
              <div>
                <dt>{{ $t('common.filters.current') }}</dt>
                <dd>{{ visibleCount }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </UCard>

      <Transition
        name="state-fade"
        mode="out-in"
      >
        <section
          v-if="loading"
          key="loading"
          class="py-8"
        >
          <UEmpty
            icon="i-mdi-loading"
            :title="t('common.states.loading')"
            :description="t('public.friendLinks.loadingDescription')"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else-if="error"
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
          key="empty"
          class="py-2"
        >
          <UEmpty
            icon="i-mdi-link-variant-off"
            :title="t('public.friendLinks.emptyTitle')"
            :description="t('public.friendLinks.emptyDescription')"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else-if="isFilteredEmpty"
          key="filtered-empty"
          class="py-2"
        >
          <UEmpty
            icon="i-mdi-magnify-close"
            :title="t('public.friendLinks.noMatchTitle')"
            :description="t('public.friendLinks.noMatchDescription')"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else
          key="content"
          class="py-2"
        >
          <div class="mb-3 flex items-center justify-between text-xs text-muted">
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-3.5"
              />
              {{ $t('public.friendLinks.visibleCount', { count: visibleCount }) }}
            </span>
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-cursor-default-click-outline"
                class="size-3.5"
              />
              {{ $t('public.friendLinks.clickHint') }}
            </span>
          </div>
          <LinkList :items="filteredItems" />
        </section>
      </Transition>
    </main>

    <CommonAppFooter />
  </div>
</template>

<style scoped>
.friend-filter-summary {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
}

.friend-filter-summary > div {
  min-width: 0;
  padding-inline: 12px;
}

.friend-filter-summary > div:first-child {
  padding-left: 0;
}

.friend-filter-summary > div:last-child {
  padding-right: 0;
}

.friend-filter-summary > div + div {
  border-left: 1px solid var(--ui-border-muted);
}

.friend-filter-summary dt {
  display: block;
  font-size: 11px;
  color: var(--ui-text-muted);
}

.friend-filter-summary dd {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
</style>
