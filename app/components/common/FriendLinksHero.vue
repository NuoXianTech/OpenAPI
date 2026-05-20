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
