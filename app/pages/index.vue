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
  loading,
  error,
  filteredItems,
  isEmpty,
  fetchList,
} = useApiList()
</script>

<template>
  <ClientOnly>
    <CommonAppHeader />
    <main class="max-w-275 mx-auto px-5 pb-6">
      <!-- API运行时间卡片组件 -->
      <ApiRunTimeCard :start-time="useRuntimeConfig().public.startTime" />

      <SearchBar v-model="query" />

      <div class="mt-4">
        <div class="text-xs uppercase tracking-[0.18em] text-muted mb-2">
          状态筛选
        </div>
        <ApiFilterTabs
          v-model="currentTab"
          :tabs="statusTabs"
          aria-label="API 状态筛选"
        />
      </div>

      <div class="mt-2">
        <div class="text-xs uppercase tracking-[0.18em] text-muted mb-2">
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
          <div class="state-panel bg-surface border border-border rounded-custom p-5 text-center">
            加载中...
          </div>
        </section>

        <section
          v-else-if="error"
          id="errorState"
          key="error"
        >
          <div class="state-panel bg-surface border border-border rounded-custom p-5 text-center">
            <div class="font-semibold">
              加载失败
            </div>
            <div class="text-muted text-[13px] mt-1">
              {{ error }}
            </div>
            <div class="mt-3">
              <button
                class="btn"
                @click="fetchList"
              >
                重试
              </button>
            </div>
          </div>
        </section>

        <section
          v-else-if="isEmpty"
          id="emptyState"
          key="empty"
          class="py-2"
        >
          <div class="state-panel empty-state bg-surface border border-border rounded-custom shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-5 text-center my-2">
            <div class="font-semibold">
              未找到匹配的 API
            </div>
            <div class="text-muted text-[13px] mt-1">
              尝试调整搜索关键词或切换筛选标签。
            </div>
          </div>
        </section>

        <section
          v-else
          id="contentState"
          key="content"
          class="py-2"
        >
          <ApiList :items="filteredItems" />
        </section>
      </Transition>
    </main>
    <CommonAppFooter />
  </ClientOnly>
</template>
