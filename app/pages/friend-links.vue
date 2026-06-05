<script lang="ts" setup>
import SearchBar from '~/components/common/SearchBar.vue'
import LinkList from '~/components/link/LinkList.vue'
import type { ApiTabOption } from '~/composables/api/types'
import { useFriendLinkList } from '~/composables/link/useFriendLinkList'

useHead({ title: '友情链接' })
useSeoMeta({
  description: '友情链接 — 与社区其他独立站点互联，欢迎交换。',
  ogTitle: '友情链接',
  ogDescription: '友情链接 — 与社区其他独立站点互联，欢迎交换。'
})

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
    <main class="mx-auto max-w-275 px-5 pt-5 pb-6 sm:pt-6">
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
          <SearchBar
            v-model="query"
            placeholder="搜索友情链接名称或描述..."
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
              状态筛选
            </div>
            <UTabs
              v-model="currentStatus"
              :items="statusTabs"
              color="neutral"
              variant="link"
              :content="false"
              aria-label="友情链接状态筛选"
            />
          </div>

          <div class="border-t border-default px-4 py-3.5 sm:px-5 lg:border-t-0 lg:py-4">
            <div class="grid grid-cols-3 gap-2.5">
              <div class="friend-filter-stat">
                <span>全部</span>
                <strong>{{ totalCount }}</strong>
              </div>
              <div class="friend-filter-stat">
                <span>正常</span>
                <strong>{{ activeCount }}</strong>
              </div>
              <div class="friend-filter-stat">
                <span>当前</span>
                <strong>{{ visibleCount }}</strong>
              </div>
            </div>
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
            icon="i-mdi-alert-circle-outline"
            title="加载失败"
            :description="error"
            variant="naked"
            size="lg"
            :actions="[{ label: '重试', color: 'neutral', variant: 'outline', icon: 'i-mdi-refresh', onClick: retryFetchFriendLinks }]"
          />
        </section>

        <section
          v-else-if="isEmpty"
          key="empty"
          class="py-2"
        >
          <UEmpty
            icon="i-mdi-link-variant-off"
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
            icon="i-mdi-magnify-close"
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
              <UIcon
                name="i-mdi-format-list-bulleted"
                class="size-3.5"
              />
              当前展示 <span class="font-mono font-semibold text-default">{{ visibleCount }}</span> 个站点
            </span>
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-cursor-default-click-outline"
                class="size-3.5"
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

<style scoped>
.friend-filter-card {
  position: relative;
}

.friend-filter-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
  background-size: 18px 18px;
  color: var(--ui-text);
  opacity: 0.025;
  mask-image: linear-gradient(to bottom, black, transparent 78%);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent 78%);
  pointer-events: none;
}

.friend-filter-stat {
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 58%, transparent);
  padding: 9px 10px;
}

.friend-filter-stat span {
  display: block;
  font-size: 11px;
  color: var(--ui-text-muted);
}

.friend-filter-stat strong {
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
