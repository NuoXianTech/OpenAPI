<script setup lang="ts">
import { ANNOUNCEMENT_LEVEL_META as levelMeta } from '#shared/types/message-level'
/**
 * 公告弹窗：自动加载生效中的公告，按 isPinned > sortOrder > createdAt 排序，
 * 默认展开第一条（"最新"），其余收起。
 *
 * 弹出时机：组件挂载且存在生效公告时自动 open。不记忆已读状态，
 * 每次进入首页都会展示。
 */

interface Announcement {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  isPinned: boolean
  isEnabled: boolean
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const open = ref(false)
const expandedIds = ref<string[]>([])

// useFetch 全局唯一 key，多个组件实例共用一份缓存。
// lazy + server: false：不阻塞 SSR、不影响首屏 LCP，hydrate 后再拉。
const { data } = useFetch<Announcement[]>(
  '/api/announcements/list',
  {
    key: 'public-announcements',
    default: () => [],
    lazy: true,
    server: false
  }
)

const items = computed<Announcement[]>(() => data.value || [])
const latestId = computed(() => items.value[0]?.id ?? null)

const accordionItems = computed(() => items.value.map(a => ({
  value: String(a.id),
  label: a.title,
  raw: a
})))

// 数据为 lazy 拉取：挂载时若缓存已有公告立即弹，否则等数据到来再弹。
// 不持久化已读状态，每次进入首页都会展示。
function openIfHasAnnouncements() {
  if (!import.meta.client || items.value.length === 0) return
  expandedIds.value = latestId.value !== null ? [String(latestId.value)] : []
  open.value = true
}

onMounted(openIfHasAnnouncements)
watch(items, openIfHasAnnouncements)

function formatDate(iso: string) {
  return formatDateTime(iso)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #header>
      <div class="flex items-center gap-2 w-full">
        <UIcon
          name="i-mdi-bullhorn-outline"
          class="size-5 text-primary"
        />
        <h3 class="text-lg font-semibold">
          站点公告
        </h3>
        <span class="ml-auto text-xs text-muted">
          共 {{ items.length }} 条
        </span>
      </div>
    </template>

    <template #body>
      <div
        v-if="items.length === 0"
        class="text-center py-8 text-muted text-sm"
      >
        暂无公告
      </div>

      <UAccordion
        v-else
        v-model="expandedIds"
        :items="accordionItems"
        type="multiple"
        :ui="{ root: 'space-y-2', item: 'border border-default rounded-md px-3' }"
      >
        <template #default="{ item }">
          <div class="flex items-center gap-2 py-2 text-left">
            <UBadge
              :color="levelMeta[(item.raw as Announcement).level].color"
              variant="subtle"
              class="shrink-0"
            >
              <UIcon
                :name="levelMeta[(item.raw as Announcement).level].icon"
                class="size-3.5"
              />
              <span class="ml-1">{{ levelMeta[(item.raw as Announcement).level].label }}</span>
            </UBadge>
            <UBadge
              v-if="(item.raw as Announcement).isPinned"
              color="warning"
              variant="soft"
              class="shrink-0"
            >
              置顶
            </UBadge>
            <span class="font-medium truncate">
              {{ item.label }}
            </span>
            <span class="ml-auto shrink-0 text-xs text-muted">
              {{ formatDate((item.raw as Announcement).createdAt) }}
            </span>
          </div>
        </template>

        <template #content="{ item }">
          <div class="py-3 text-sm whitespace-pre-wrap leading-6">
            {{ (item.raw as Announcement).content }}
          </div>
          <div
            v-if="(item.raw as Announcement).linkUrl"
            class="pb-3"
          >
            <UButton
              :to="(item.raw as Announcement).linkUrl || undefined"
              target="_blank"
              size="xs"
              variant="outline"
              icon="i-mdi-open-in-new"
              trailing
            >
              查看详情
            </UButton>
          </div>
        </template>
      </UAccordion>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          color="neutral"
          variant="outline"
          @click="open = false"
        >
          我知道了
        </UButton>
      </div>
    </template>
  </UModal>
</template>
