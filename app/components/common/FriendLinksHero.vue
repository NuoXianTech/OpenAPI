<script lang="ts" setup>
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
              <span
                class="links-status-dot"
                :class="{ 'is-warning': inactiveCount > 0, 'is-neutral': totalCount <= 0 }"
              />
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
          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-bookmark-outline"
                class="size-4"
              />
            </div>
            <div class="hero-stat__value">
              {{ totalCount }}
            </div>
            <div class="hero-stat__label">
              收录数
            </div>
          </div>

          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-check-circle-outline"
                class="size-4"
              />
            </div>
            <div class="hero-stat__value">
              {{ ratio }}<span class="text-base text-muted">%</span>
            </div>
            <div class="hero-stat__label">
              可达率
            </div>
          </div>

          <div class="hero-stat">
            <div class="hero-stat__icon">
              <UIcon
                name="i-mdi-close-circle-outline"
                class="size-4"
              />
            </div>
            <div class="hero-stat__value">
              {{ inactiveCount }}
            </div>
            <div class="hero-stat__label">
              异常数
            </div>
          </div>
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

.links-status-dot {
  --links-status-color: var(--ui-success);

  position: relative;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--links-status-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--links-status-color) 18%, transparent);
  flex: 0 0 auto;
}

.links-status-dot::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--links-status-color) 55%, transparent);
  animation: linksPulse 2s ease-out infinite;
}

.links-status-dot.is-warning {
  --links-status-color: var(--ui-warning);
}

.links-status-dot.is-neutral {
  --links-status-color: var(--ui-text-muted);
}

.links-status-dot.is-neutral::after {
  display: none;
}

.hero-stat {
  position: relative;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 8%) 0%,
      color-mix(in srgb, var(--ui-bg) 82%, transparent) 100%);
  border-radius: 8px;
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 40%, transparent);
  transition: transform 220ms ease, border-color 220ms ease;
  backdrop-filter: blur(8px);
}

.hero-stat:hover {
  transform: translateY(-2px);
  border-color: var(--ui-border-accented);
}

.dark .hero-stat {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 5%) 0%,
      color-mix(in srgb, var(--ui-bg) 86%, transparent) 100%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
}

.hero-stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ui-text) 7%, transparent);
  color: var(--ui-text-muted);
  margin-bottom: 4px;
}

.hero-stat:nth-child(1) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-info) 13%, transparent);
  color: var(--ui-info);
}

.hero-stat:nth-child(2) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-success) 13%, transparent);
  color: var(--ui-success);
}

.hero-stat:nth-child(3) .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-error) 13%, transparent);
  color: var(--ui-error);
}

.hero-stat__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hero-stat__label {
  font-size: 11px;
  color: var(--ui-text-muted);
  letter-spacing: 0;
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

  .hero-stat__value {
    font-size: 18px;
  }

  .hero-stat__icon {
    width: 22px;
    height: 22px;
  }
}

@keyframes linksPulse {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
</style>
