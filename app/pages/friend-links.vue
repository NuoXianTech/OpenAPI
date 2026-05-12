<script lang="ts" setup>
import ApiFilterTabs from '~/components/api/ApiFilterTabs.vue'
import SearchBar from '~/components/common/SearchBar.vue'
import LinkList from '~/components/link/LinkList.vue'
import type { ApiTabOption } from '~/composables/api/types'
import { useFriendLinkList } from '~/composables/link/useFriendLinkList'

useHead({ title: '友情链接' })

const query = ref('')
const currentStatus = ref<string | number>('all')

const statusTabs: ApiTabOption[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 1 },
  { label: '异常', value: 0 }
]

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

const retryFetchFriendLinks = async () => {
  await fetchFriendLinks()
}

const totalCount = computed(() => items.value.length)
const activeCount = computed(() => items.value.filter(item => item.isActive).length)
const visibleCount = computed(() => filteredItems.value.length)
</script>

<template>
  <div>
    <CommonAppHeader />

    <main class="mx-auto max-w-275 px-5 pb-6">
      <CommonFriendLinksHero
        :total-count="totalCount"
        :active-count="activeCount"
      />

      <UCard
        :ui="{ root: 'mb-4 overflow-hidden', body: 'p-0 sm:p-0' }"
        variant="subtle"
      >
        <div class="border-b border-default px-4 py-3 sm:px-5">
          <SearchBar
            v-model="query"
            placeholder="搜索友情链接名称或描述..."
            class="!mt-0 !mb-0"
          />
        </div>

        <div class="px-4 py-3.5 sm:px-5 sm:py-4">
          <div class="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
            <Icon
              name="i-lucide-filter"
              size="12"
              :ssr="true"
            />
            状态筛选
          </div>
          <ApiFilterTabs
            v-model="currentStatus"
            :tabs="statusTabs"
            aria-label="友情链接状态筛选"
          />
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
            icon="i-lucide-loader"
            title="加载中..."
            description="正在拉取友情链接"
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
            icon="i-lucide-circle-alert"
            title="加载失败"
            :description="error"
            variant="naked"
            size="lg"
            :actions="[{ label: '重试', color: 'neutral', variant: 'outline', icon: 'i-lucide-refresh-cw', onClick: retryFetchFriendLinks }]"
          />
        </section>

        <section
          v-else-if="isEmpty"
          key="empty"
          class="py-2"
        >
          <UEmpty
            icon="i-lucide-link-2-off"
            title="暂无友情链接"
            description="暂无可展示的友情链接"
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
            icon="i-lucide-search-x"
            title="无匹配结果"
            description="当前筛选条件没有匹配结果，试试其他关键词或状态"
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
              <Icon
                name="i-lucide-list"
                size="13"
                :ssr="true"
              />
              当前展示 <span class="font-mono font-semibold text-default">{{ visibleCount }}</span> 个站点
            </span>
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <Icon
                name="i-lucide-mouse-pointer-click"
                size="13"
                :ssr="true"
              />
              点击卡片访问站点
            </span>
          </div>
          <LinkList :items="filteredItems" />
        </section>
      </Transition>
    </main>

    <CommonAppFooter />
  </div>
</template>
