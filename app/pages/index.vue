<script lang="ts" setup>
import SearchBar from '~/components/common/SearchBar.vue'
import ApiList from '~/components/api/ApiList.vue'
import ApiFilterTabs from '~/components/api/ApiFilterTabs.vue'
import { useApiList } from '~/composables/api/useApiList'

const {
  query,
  currentTab,
  currentCategory,
  statusTabs,
  categoryTabs,
  categoryMap,
  loading,
  error,
  filteredItems,
  isEmpty,
  fetchList,
} = useApiList()

const { settings } = useSiteSettings()
const announcementSettings = computed(() => settings.value.announcement)
</script>

<template>
  <div>
    <CommonAppHeader />
    <main class="mx-auto max-w-275 px-5 pb-6">
      <ApiRunTimeCard :start-time="settings.startTime" />

      <SearchBar v-model="query" />

      <UCard
        :ui="{ root: 'mt-4', body: 'p-4 sm:p-5 space-y-4' }"
        variant="subtle"
      >
        <div>
          <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
            <Icon
              name="mdi:filter-variant"
              size="14"
              :ssr="true"
            />
            状态筛选
          </div>
          <ApiFilterTabs
            v-model="currentTab"
            :tabs="statusTabs"
            aria-label="API 状态筛选"
          />
        </div>

        <USeparator />

        <div>
          <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
            <Icon
              name="mdi:tag-multiple-outline"
              size="14"
              :ssr="true"
            />
            分类筛选
          </div>
          <ApiFilterTabs
            v-model="currentCategory"
            :tabs="categoryTabs"
            :max-visible="10"
            aria-label="API 分类筛选"
          />
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
          class="py-6"
        >
          <UAlert
            icon="mdi:loading"
            color="neutral"
            variant="subtle"
            title="加载中..."
            description="正在拉取最新的 API 列表"
            class="state-panel"
          />
        </section>

        <section
          v-else-if="error"
          id="errorState"
          key="error"
          class="py-2"
        >
          <UAlert
            icon="mdi:alert-circle-outline"
            color="error"
            variant="subtle"
            title="加载失败"
            :description="error"
            class="state-panel"
            :actions="[{ label: '重试', color: 'neutral', variant: 'outline', onClick: fetchList }]"
          />
        </section>

        <section
          v-else-if="isEmpty"
          id="emptyState"
          key="empty"
          class="py-2"
        >
          <UAlert
            icon="mdi:magnify-close"
            color="neutral"
            variant="subtle"
            title="未找到匹配的 API"
            description="尝试调整搜索关键词或切换筛选标签。"
            class="state-panel empty-state"
          />
        </section>

        <section
          v-else
          id="contentState"
          key="content"
          class="py-2"
        >
          <ApiList
            :items="filteredItems"
            :category-map="categoryMap"
          />
        </section>
      </Transition>
    </main>
    <CommonAppFooter />
    <LazyCommonAnnouncementPopup
      v-if="announcementSettings?.showOnHome"
      storage-scope="home"
    />
  </div>
</template>
