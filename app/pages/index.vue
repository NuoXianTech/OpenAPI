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

      <div class="mt-4">
        <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted">
          状态筛选
        </div>
        <ApiFilterTabs
          v-model="currentTab"
          :tabs="statusTabs"
          aria-label="API 状态筛选"
        />
      </div>

      <div class="mt-2">
        <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted">
          分类筛选
        </div>
        <ApiFilterTabs
          v-model="currentCategory"
          :tabs="categoryTabs"
          :max-visible="10"
          aria-label="API 分类筛选"
        />
      </div>

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
          <UCard class="state-panel border-default py-5 shadow-sm">
            <div class="px-5 text-center text-sm text-muted">
              加载中...
            </div>
          </UCard>
        </section>

        <section
          v-else-if="error"
          id="errorState"
          key="error"
        >
          <UCard class="state-panel border-default py-5 shadow-sm">
            <div class="px-5 text-center">
              <div class="font-semibold">
                加载失败
              </div>
              <div class="mt-1 text-[13px] text-muted">
                {{ error }}
              </div>
              <div class="mt-3">
                <UButton
                  variant="outline"
                  size="sm"
                  @click="fetchList"
                >
                  重试
                </UButton>
              </div>
            </div>
          </UCard>
        </section>

        <section
          v-else-if="isEmpty"
          id="emptyState"
          key="empty"
          class="py-2"
        >
          <UCard class="state-panel empty-state my-2 border-default py-5 shadow-sm">
            <div class="px-5 text-center">
              <div class="font-semibold">
                未找到匹配的 API
              </div>
              <div class="mt-1 text-[13px] text-muted">
                尝试调整搜索关键词或切换筛选标签。
              </div>
            </div>
          </UCard>
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
