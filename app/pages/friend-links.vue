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

onMounted(() => {
  void retryFetchFriendLinks()
})
</script>

<template>
  <ClientOnly>
    <header class="mx-auto flex max-w-[1100px] items-end justify-between gap-4 px-5 py-6">
      <div class="flex items-stretch gap-3">
        <div
          id="brandTitleCol"
          class="flex flex-col justify-center"
        >
          <h1 class="m-0 text-2xl font-normal tracking-wide">
            友情链接
          </h1>
          <p class="m-0 mt-1 text-xs text-muted">
            每一个独立站点都是一个信息孤岛，交换友情链接就是一种很棒的架桥方式。
          </p>
        </div>
      </div>

      <UButton
        to="/"
        variant="outline"
        size="sm"
        class="ml-auto"
      >
        <Icon
          name="mdi:home"
          size="14"
          class="transition-transform duration-300 chev"
          :ssr="true"
        />
        <span>返回首页</span>
      </UButton>
    </header>

    <main class="mx-auto max-w-[1100px] px-5 pb-6">
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
          <UCard class="state-panel border-default py-5 shadow-sm">
            <div class="px-5 text-center text-sm text-muted">
              加载中...
            </div>
          </UCard>
        </section>

        <section
          v-else-if="error"
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
                  @click="retryFetchFriendLinks"
                >
                  重试
                </UButton>
              </div>
            </div>
          </UCard>
        </section>

        <section
          v-else-if="isEmpty"
          key="empty"
          class="py-2"
        >
          <UCard class="state-panel border-default py-5 shadow-sm">
            <div class="px-5 text-center text-sm text-muted">
              暂无可展示的友情链接。
            </div>
          </UCard>
        </section>

        <section
          v-else-if="isFilteredEmpty"
          key="filtered-empty"
          class="py-2"
        >
          <UCard class="state-panel border-default py-5 shadow-sm">
            <div class="px-5 text-center text-sm text-muted">
              当前筛选条件没有匹配结果，试试其他关键词或状态。
            </div>
          </UCard>
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
  </ClientOnly>
</template>
