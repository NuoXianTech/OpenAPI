<script setup lang="ts">
import {
  ANNOUNCEMENT_LEVEL_META as levelMeta,
  type Announcement,
  type MessageLevelMeta
} from '#shared/types/content'
/**
 * 公告弹窗：自动加载生效中的公告，按 isPinned > sortOrder > createdAt 排序，
 * 默认展开第一条，其余收起。
 *
 * 视觉沿用首页语义色体系：等级图标用语义色 chip，卡片化每条公告。
 * 公告数量无上限，body 限高 60dvh 后内部滚动，头/尾固定。
 * 暗色由 --ui-* 语义变量自动适配。
 *
 * 弹出时机：组件挂载且存在生效公告时自动 open。不记忆已读状态，
 * 每次进入首页都会展示。
 */

// 预解析为展示项：把等级元数据与日期格式化提前算好，模板保持声明式无逻辑。
// 字段刻意避开 UAccordion 内建的 `icon` / `content`（会被组件自动渲染），改用 levelIcon / text。
interface AnnouncementItem {
  value: string
  label: string
  color: MessageLevelMeta['color']
  levelIcon: string
  levelLabel: string
  isPinned: boolean
  text: string
  linkUrl: string | null
  date: string
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

const accordionItems = computed<AnnouncementItem[]>(() => items.value.map(a => ({
  value: String(a.id),
  label: a.title,
  color: levelMeta[a.level].color,
  levelIcon: levelMeta[a.level].icon,
  levelLabel: levelMeta[a.level].label,
  isPinned: a.isPinned,
  text: a.content,
  linkUrl: a.linkUrl,
  date: formatDateTime(a.createdAt)
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

// 弹窗为自动出现（非用户点击触发），阻止打开时的自动聚焦：
// 否则首条 accordion trigger 会拿到 :focus-visible，在 zinc 黑白主题下 outline-primary
// 是纯黑描边，看起来像“黑色边框”圈住第一条。键盘 Tab 仍可正常进入弹窗。
function preventAutoFocus(event: Event) {
  event.preventDefault()
}
</script>

<template>
  <UModal
    v-model:open="open"
    :content="{ onOpenAutoFocus: preventAutoFocus }"
    :ui="{
      content: 'sm:max-w-xl',
      body: 'p-4 sm:p-5 max-h-[60dvh]'
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span class="announce-icon">
          <UIcon
            name="i-lucide-megaphone"
            class="size-5"
          />
        </span>
        <div class="min-w-0">
          <h3 class="text-lg leading-tight font-semibold text-highlighted">
            站点公告
          </h3>
          <p class="mt-0.5 text-xs text-muted">
            共 {{ items.length }} 条 · 最新动态与重要通知
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div
        v-if="items.length === 0"
        class="py-10 text-center text-sm text-muted"
      >
        暂无公告
      </div>

      <UAccordion
        v-else
        v-model="expandedIds"
        :items="accordionItems"
        type="multiple"
        :ui="{
          root: 'flex flex-col gap-2.5',
          item: 'rounded-lg border border-default last:border-b transition-colors hover:bg-elevated/30',
          trigger: 'px-3 py-3 gap-3',
          trailingIcon: 'size-4 text-dimmed',
          body: 'px-3 pb-3 pt-0'
        }"
      >
        <template #default="{ item }">
          <div class="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span
              class="level-chip"
              :class="`is-${item.color}`"
            >
              <UIcon
                :name="item.levelIcon"
                class="size-4"
              />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="truncate text-sm font-medium text-highlighted">
                  {{ item.label }}
                </span>
                <a
                  v-if="item.linkUrl"
                  :href="item.linkUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="announce-link"
                  title="查看详情"
                  aria-label="查看详情"
                  @click.stop
                  @keydown.enter.stop
                >
                  <UIcon
                    name="i-lucide-external-link"
                    class="size-3.5"
                  />
                </a>
                <UIcon
                  v-if="item.isPinned"
                  name="i-lucide-pin"
                  class="size-3.5 shrink-0 text-warning"
                  title="置顶"
                />
              </div>
              <div class="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span>{{ item.levelLabel }}</span>
                <span class="text-dimmed">·</span>
                <UIcon
                  name="i-lucide-clock"
                  class="size-3 shrink-0"
                />
                <span class="font-mono">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 用 #body 而非 #content：#content 会替换掉带 px-3/pb-3 的 body padding 容器，
             导致正文顶死卡片左下边框。#body 落进 ui.body 容器，再加 pl-11(44px=chip 32+gap 12)
             让正文与上方标题文字左对齐。 -->
        <template #body="{ item }">
          <p class="pl-11 text-sm leading-6 whitespace-pre-wrap break-words text-default">
            {{ item.text }}
          </p>
        </template>
      </UAccordion>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-3">
        <p class="hidden text-xs text-muted sm:block">
          每次进入首页都会展示最新公告
        </p>
        <UButton
          color="neutral"
          icon="i-lucide-check"
          class="ml-auto"
          @click="() => { open = false }"
        >
          我知道了
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.announce-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 9px;
  background: color-mix(in srgb, var(--ui-info) 12%, transparent);
  color: var(--ui-info);
}

.announce-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 2px;
  border-radius: 6px;
  color: var(--ui-text-dimmed);
  transition: color 150ms ease, background-color 150ms ease;
}

.announce-link:hover {
  color: var(--ui-info);
  background: color-mix(in srgb, var(--ui-info) 12%, transparent);
}

.level-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-text) 7%, transparent);
  color: var(--ui-text-muted);
}

.level-chip.is-info {
  background: color-mix(in srgb, var(--ui-info) 13%, transparent);
  color: var(--ui-info);
}

.level-chip.is-success {
  background: color-mix(in srgb, var(--ui-success) 13%, transparent);
  color: var(--ui-success);
}

.level-chip.is-warning {
  background: color-mix(in srgb, var(--ui-warning) 15%, transparent);
  color: var(--ui-warning);
}

.level-chip.is-error {
  background: color-mix(in srgb, var(--ui-error) 13%, transparent);
  color: var(--ui-error);
}
</style>
