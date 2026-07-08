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
</script>

<template>
  <section class="links-hero">
    <div
      class="links-hero__pattern"
      aria-hidden="true"
    />

    <div class="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div class="links-hero__layout">
        <div class="links-hero__copy">
          <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
            友情链接
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            与社区里的独立站点互相连接，把有趣的服务、项目和创作者放在更容易被发现的位置。
          </p>
        </div>

        <div class="links-hero__aside">
          <div
            class="links-hero__actions"
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
              返回首页
            </UButton>
          </div>

          <div class="links-hero__stats grid grid-cols-3 gap-2.5 sm:gap-3">
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

.links-hero__layout {
  display: grid;
  grid-template-areas:
    "copy"
    "aside";
  gap: 16px;
}

.links-hero__copy {
  grid-area: copy;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.links-hero__aside {
  grid-area: aside;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.links-hero__actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-bg) 58%, transparent);
  backdrop-filter: blur(8px);
}

.links-hero__stats {
  min-width: 0;
}

.links-hero__stats :deep(.hero-stat-card) {
  padding: 10px 10px 11px;
}

.links-hero__stats :deep(.hero-stat-card__icon) {
  width: 24px;
  height: 24px;
  margin-bottom: 3px;
}

.links-hero__stats :deep(.hero-stat-card__value) {
  font-size: 20px;
}

.links-hero__nav-item {
  color: var(--ui-text-muted);
}

@media (min-width: 1024px) {
  .links-hero__layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    grid-template-areas: "copy aside";
    gap: 36px;
    align-items: stretch;
  }

  .links-hero__actions {
    justify-content: flex-end;
    align-self: flex-end;
  }
}

@media (max-width: 640px) {
  .links-hero__actions {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
