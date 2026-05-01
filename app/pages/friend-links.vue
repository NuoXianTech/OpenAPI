<script lang="ts" setup>
import ApiFilterTabs from '~/components/api/ApiFilterTabs.vue'
import SearchBar from '~/components/common/SearchBar.vue'
import LinkList from '~/components/link/LinkList.vue'
import type { ApiTabOption } from '~/composables/api/types'
import { useFriendLinkList } from '~/composables/link/useFriendLinkList'

const query = ref('')
const currentStatus = ref<string | number>('all')

const statusTabs: ApiTabOption[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
]

const {
  items,
  loading,
  error,
  isEmpty,
  fetchFriendLinks,
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
</script>

<template>
  <div>
    <CommonAppHeader />

    <main class="mx-auto max-w-275 px-5 pb-6">
      <UCard
        :ui="{ root: 'mb-4', body: 'p-4 sm:p-5' }"
        variant="subtle"
      >
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-0">
            <h2 class="flex items-center gap-2 text-lg font-semibold tracking-wide">
              <Icon
                name="mdi:link-variant"
                size="20"
                :ssr="true"
              />
              友情链接
            </h2>
            <p class="mt-1 text-xs text-muted">
              每一个独立站点都是一个信息孤岛，交换友情链接就是一种很棒的架桥方式。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              class="rounded-full"
            >
              共 {{ totalCount }} 个
            </UBadge>
            <UBadge
              color="success"
              variant="soft"
              class="rounded-full"
            >
              正常 {{ activeCount }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <SearchBar
        v-model="query"
        placeholder="搜索友情链接名称或描述..."
      />

      <ApiFilterTabs
        v-model="currentStatus"
        :tabs="statusTabs"
        aria-label="友情链接状态筛选"
      />

      <Transition
        name="state-fade"
        mode="out-in"
      >
        <section
          v-if="loading"
          key="loading"
          class="py-6"
        >
          <UAlert
            icon="mdi:loading"
            color="neutral"
            variant="subtle"
            title="加载中..."
            description="正在拉取友情链接"
            class="state-panel"
          />
        </section>

        <section
          v-else-if="error"
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
            :actions="[{ label: '重试', color: 'neutral', variant: 'outline', onClick: retryFetchFriendLinks }]"
          />
        </section>

        <section
          v-else-if="isEmpty"
          key="empty"
          class="py-2"
        >
          <UAlert
            icon="mdi:link-off"
            color="neutral"
            variant="subtle"
            title="暂无友情链接"
            description="暂无可展示的友情链接。"
            class="state-panel"
          />
        </section>

        <section
          v-else-if="isFilteredEmpty"
          key="filtered-empty"
          class="py-2"
        >
          <UAlert
            icon="mdi:magnify-close"
            color="neutral"
            variant="subtle"
            title="无匹配结果"
            description="当前筛选条件没有匹配结果，试试其他关键词或状态。"
            class="state-panel"
          />
        </section>

        <section
          v-else
          key="content"
          class="py-2"
        >
          <LinkList :items="filteredItems" />
        </section>
      </Transition>
    </main>

    <CommonAppFooter />
  </div>
</template>
