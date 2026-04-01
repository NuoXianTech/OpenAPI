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
    <main class="mx-auto max-w-275 px-5 pb-6">
      <!-- API运行时间卡片组件 -->
      <ApiRunTimeCard :start-time="useRuntimeConfig().public.startTime" />

      <SearchBar v-model="query" />

      <div class="mt-4">
        <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          状态筛选
        </div>
        <ApiFilterTabs
          v-model="currentTab"
          :tabs="statusTabs"
          aria-label="API 状态筛选"
        />
      </div>

      <div class="mt-2">
        <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
          <UiCard class="state-panel border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center text-sm text-muted-foreground">
              加载中...
            </UiCardContent>
          </UiCard>
        </section>

        <section
          v-else-if="error"
          id="errorState"
          key="error"
        >
          <UiCard class="state-panel border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center">
              <div class="font-semibold">
                加载失败
              </div>
              <div class="mt-1 text-[13px] text-muted-foreground">
                {{ error }}
              </div>
              <div class="mt-3">
                <UiButton
                  variant="outline"
                  size="sm"
                  @click="fetchList"
                >
                  重试
                </UiButton>
              </div>
            </UiCardContent>
          </UiCard>
        </section>

        <section
          v-else-if="isEmpty"
          id="emptyState"
          key="empty"
          class="py-2"
        >
          <UiCard class="state-panel empty-state my-2 border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center">
              <div class="font-semibold">
                未找到匹配的 API
              </div>
              <div class="mt-1 text-[13px] text-muted-foreground">
                尝试调整搜索关键词或切换筛选标签。
              </div>
            </UiCardContent>
          </UiCard>
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
