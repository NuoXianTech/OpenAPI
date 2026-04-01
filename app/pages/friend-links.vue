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

onMounted(() => {
  void fetchFriendLinks()
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
          <p class="m-0 mt-1 text-xs text-muted-foreground">
            每一个独立站点都是一个信息孤岛，交换友情链接就是一种很棒的架桥方式。
          </p>
        </div>
      </div>

      <UiButton
        as-child
        variant="outline"
        size="sm"
        class="ml-auto"
      >
        <NuxtLink to="/">
          <Icon
            name="mdi:home"
            size="14"
            class="transition-transform duration-300 chev"
            :ssr="true"
          />
          <span>返回首页</span>
        </NuxtLink>
      </UiButton>
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
          <UiCard class="state-panel border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center text-sm text-muted-foreground">
              加载中...
            </UiCardContent>
          </UiCard>
        </section>

        <section
          v-else-if="error"
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
                  @click="fetchFriendLinks"
                >
                  重试
                </UiButton>
              </div>
            </UiCardContent>
          </UiCard>
        </section>

        <section
          v-else-if="isEmpty"
          key="empty"
          class="py-2"
        >
          <UiCard class="state-panel border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center text-sm text-muted-foreground">
              暂无可展示的友情链接。
            </UiCardContent>
          </UiCard>
        </section>

        <section
          v-else-if="isFilteredEmpty"
          key="filtered-empty"
          class="py-2"
        >
          <UiCard class="state-panel border-border py-5 shadow-sm">
            <UiCardContent class="px-5 text-center text-sm text-muted-foreground">
              当前筛选条件没有匹配结果，试试其他关键词或状态。
            </UiCardContent>
          </UiCard>
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
