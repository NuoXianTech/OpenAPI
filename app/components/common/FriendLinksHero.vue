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
</script>

<template>
  <section class="links-hero">
    <div
      class="links-hero__pattern"
      aria-hidden="true"
    />

    <div class="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-10 lg:p-9">
      <div class="flex flex-col">
        <UBadge
          color="neutral"
          variant="outline"
          size="sm"
          class="mb-3 w-fit gap-1 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]"
        >
          <UIcon
            name="i-mdi-link-variant"
            class="size-3.5"
          />
          Friend Links
        </UBadge>

        <h1 class="m-0 flex items-baseline gap-2 text-[28px] font-semibold leading-tight tracking-tight text-default sm:text-[34px]">
          友情链接
          <span class="links-hero__title-mark" />
        </h1>
        <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
          每一个独立站点都是一座信息孤岛，交换友情链接是一种很棒的架桥方式。
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2.5 text-xs text-muted">
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-mdi-earth"
              class="size-3.5"
            />
            站点互联
          </span>
          <USeparator
            orientation="vertical"
            class="h-3"
          />
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-mdi-handshake-outline"
              class="size-3.5"
            />
            欢迎交换
          </span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
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

        <div class="hero-stat hero-stat--accent">
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
  </section>
</template>

<style scoped>
.links-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  border-radius: 20px;
  margin-bottom: 16px;
  isolation: isolate;
}

.links-hero__pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, currentColor 1px, transparent 1px),
    linear-gradient(to bottom, currentColor 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ui-text);
  opacity: 0.04;
  mask-image: radial-gradient(ellipse at top right, black 0%, transparent 65%);
  -webkit-mask-image: radial-gradient(ellipse at top right, black 0%, transparent 65%);
  pointer-events: none;
}

.links-hero__title-mark {
  display: inline-block;
  width: 28px;
  height: 2px;
  background: var(--ui-text);
  border-radius: 2px;
  vertical-align: 6px;
  position: relative;
  animation: linksDash 2.4s ease-in-out infinite;
  transform-origin: left center;
}

.hero-stat {
  position: relative;
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg) 80%, transparent);
  border-radius: 14px;
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: transform 220ms ease, border-color 220ms ease, background-color 220ms ease;
  backdrop-filter: blur(4px);
}

.hero-stat:hover {
  transform: translateY(-2px);
  border-color: var(--ui-border-accented);
}

.hero-stat--accent {
  background: var(--ui-text);
  border-color: var(--ui-text);
  color: var(--ui-text-inverted);
}

.hero-stat--accent .hero-stat__label,
.hero-stat--accent .text-muted {
  color: color-mix(in srgb, var(--ui-text-inverted) 70%, transparent) !important;
}

.hero-stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-text) 8%, transparent);
  color: var(--ui-text);
  margin-bottom: 4px;
}

.hero-stat--accent .hero-stat__icon {
  background: color-mix(in srgb, var(--ui-text-inverted) 14%, transparent);
  color: var(--ui-text-inverted);
}

.hero-stat__value {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.hero-stat__label {
  font-size: 11px;
  color: var(--ui-text-muted);
  letter-spacing: 0.06em;
}

@media (max-width: 640px) {
  .hero-stat__value {
    font-size: 18px;
  }
  .hero-stat__icon {
    width: 22px;
    height: 22px;
  }
}

@keyframes linksDash {
  0%, 100% { transform: scaleX(1); opacity: 1; }
  50% { transform: scaleX(0.3); opacity: 0.55; }
}
</style>
