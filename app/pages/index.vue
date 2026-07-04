<script lang="ts" setup>
import SearchBar from '~/components/common/SearchBar.vue'
import ApiList from '~/components/api/ApiList.vue'
import FilterTabs from '~/components/common/FilterTabs.vue'
import { useApiList } from '~/composables/api/use-api-list'
import { API_STATUS } from '#shared/config/api-status'

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

const visibleCount = computed(() => filteredItems.value.length)

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
  <div>
    <main class="mx-auto max-w-275 px-5 pt-5 pb-6 sm:pt-6">
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

      <UCard
        :ui="{ root: 'mb-4 overflow-hidden', body: 'p-0 sm:p-0' }"
        variant="subtle"
      >
        <div class="border-b border-default px-4 py-3 sm:px-5">
          <SearchBar
            v-model="query"
            class="!mt-0 !mb-0"
          />
        </div>

        <div class="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(220px,0.58fr)_1fr]">
          <div class="px-4 py-3.5 sm:px-5 lg:border-r lg:border-default lg:py-4">
            <div class="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <UIcon
                name="i-mdi-filter-variant"
                class="size-3"
              />
              接口状态
            </div>
            <FilterTabs
              v-model="currentTab"
              :tabs="statusTabs"
              :enable-collapse="false"
              aria-label="API 状态筛选"
            />
          </div>

          <div class="border-t border-default px-4 py-3.5 sm:px-5 lg:border-t-0 lg:py-4">
            <div class="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <UIcon
                name="i-mdi-tag-multiple-outline"
                class="size-3"
              />
              接口分类
            </div>
            <FilterTabs
              v-model="currentCategory"
              :tabs="categoryTabs"
              :max-visible="10"
              search-placeholder="搜索分类"
              empty-text="未找到分类"
              aria-label="API 分类筛选"
            />
          </div>
        </div>
      </UCard>

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
            title="加载中..."
            description="正在拉取最新的 API 列表"
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
            title="加载失败"
            :description="error"
            variant="naked"
            size="lg"
            :actions="[{ label: '重试', color: 'neutral', variant: 'outline', icon: 'i-mdi-refresh', onClick: fetchList }]"
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
            title="未找到匹配的 API"
            description="尝试调整搜索关键词或切换筛选标签"
            variant="naked"
            size="lg"
          />
        </section>

        <section
          v-else
          id="contentState"
          key="content"
          class="py-2"
        >
          <div class="mb-3 flex items-center justify-between text-xs text-muted">
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-3.5"
              />
              当前展示 <span class="font-mono font-semibold text-default">{{ visibleCount }}</span> 个接口
            </span>
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-cursor-default-click-outline"
                class="size-3.5"
              />
              点击卡片查看详情
            </span>
          </div>
          <ApiList
            :items="filteredItems"
          />
        </section>
      </Transition>
    </main>
    <CommonAppFooter />
    <LazyCommonAnnouncementPopup />
  </div>
</template>
