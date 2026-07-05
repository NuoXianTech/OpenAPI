<script setup lang="ts">
interface Props {
  totalCount?: number
  activeCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  activeCount: 0
})

const inactiveCount = computed(() => Math.max(0, props.totalCount - props.activeCount))
const ratio = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.round((props.activeCount / props.totalCount) * 100)
})

const networkStatus = computed(() => {
  if (props.totalCount <= 0) {
    return '等待收录'
  }
  if (inactiveCount.value > 0) {
    return '部分站点异常'
  }
  return '站点可达'
})

type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'neutral'

const networkTone = computed<StatusTone>(() => {
  if (props.totalCount <= 0) {
    return 'neutral'
  }
  if (inactiveCount.value > 0) {
    return 'warning'
  }
  return 'success'
})
</script>

<template>
  <section class="links-hero">
    <div
      class="links-hero__pattern"
      aria-hidden="true"
    />

    <div class="relative p-5 sm:p-7 lg:p-8">
      <div class="links-hero__topbar">
        <UBadge
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-mdi-link-variant"
          class="w-fit rounded-md px-2.5 py-1 text-[11px]"
        >
          Friend Links
        </UBadge>

        <div
          class="links-hero__nav"
          aria-label="友情链接导航"
        >
          <UButton
            to="/"
            icon="i-mdi-home-outline"
            color="neutral"
            variant="ghost"
            size="sm"
            class="links-hero__nav-item"
          >
            API 首页
          </UButton>
          <UButton
            to="/stats"
            icon="i-mdi-chart-bar"
            color="neutral"
            variant="ghost"
            size="sm"
            class="links-hero__nav-item"
          >
            调用统计
          </UButton>
        </div>
      </div>

      <div class="mt-6 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10">
        <div class="flex flex-col">
          <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
            友情链接
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            与社区里的独立站点互相连接，把有趣的服务、项目和创作者放在更容易被发现的位置。
          </p>

          <div class="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted">
            <span class="inline-flex items-center gap-1.5">
              <CommonStatusDot :tone="networkTone" />
              {{ networkStatus }}
            </span>
            <USeparator
              orientation="vertical"
              class="h-3"
            />
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-mdi-earth"
                class="size-3.5"
              />
              站点互联
            </span>
            <USeparator
              orientation="vertical"
              class="hidden h-3 sm:inline-flex"
            />
            <span class="hidden items-center gap-1.5 sm:inline-flex">
              <UIcon
                name="i-mdi-handshake-outline"
                class="size-3.5"
              />
              欢迎交换
            </span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
          <CommonHeroStatCard
            icon="i-mdi-bookmark-outline"
            icon-tone="info"
          >
            <template #value>
              {{ totalCount }}
            </template>
            收录数
          </CommonHeroStatCard>

          <CommonHeroStatCard
            icon="i-mdi-check-circle-outline"
            icon-tone="success"
          >
            <template #value>
              {{ ratio }}<span class="text-base text-muted">%</span>
            </template>
            可达率
          </CommonHeroStatCard>

          <CommonHeroStatCard
            icon="i-mdi-close-circle-outline"
            icon-tone="error"
          >
            <template #value>
              {{ inactiveCount }}
            </template>
            异常数
          </CommonHeroStatCard>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.links-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 90%, var(--ui-primary) 10%) 0%,
      var(--ui-bg-elevated) 42%,
      color-mix(in srgb, var(--ui-bg) 84%, var(--ui-info) 16%) 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  isolation: isolate;
}

.dark .links-hero {
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 88%, var(--ui-primary) 12%) 0%,
      var(--ui-bg-elevated) 46%,
      color-mix(in srgb, var(--ui-bg) 82%, var(--ui-success) 10%) 100%);
}

.links-hero__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
  background-size: 18px 18px;
  color: var(--ui-text);
  opacity: 0.045;
  mask-image: radial-gradient(ellipse at top right, black 10%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at top right, black 10%, transparent 70%);
  pointer-events: none;
}

.links-hero__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.links-hero__nav {
  margin-left: auto;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 58%, transparent);
  backdrop-filter: blur(8px);
}

.links-hero__nav-item {
  color: var(--ui-text-muted);
}

@media (max-width: 640px) {
  .links-hero__topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .links-hero__nav {
    justify-content: flex-start;
    margin-left: 0;
    width: 100%;
  }
}
</style>
