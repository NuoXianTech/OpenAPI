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
    <div class="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div class="links-hero__layout">
        <div class="links-hero__copy">
          <h1 class="m-0 text-[28px] leading-tight font-semibold text-default sm:text-[34px]">
            {{ $t('public.friendLinks.title') }}
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            {{ $t('public.friendLinks.description') }}
          </p>
        </div>

        <div class="links-hero__aside">
          <div class="links-hero__stats grid grid-cols-3 gap-2.5 sm:gap-3">
            <CommonHeroStatCard
              icon="i-mdi-bookmark-outline"
              icon-tone="violet"
            >
              <template #value>
                {{ totalCount }}
              </template>
              {{ $t('public.friendLinks.collected') }}
            </CommonHeroStatCard>

            <CommonHeroStatCard
              icon="i-mdi-check-circle-outline"
              icon-tone="blue"
            >
              <template #value>
                {{ ratio }}<span class="text-base text-muted">%</span>
              </template>
              {{ $t('public.friendLinks.availability') }}
            </CommonHeroStatCard>

            <CommonHeroStatCard
              icon="i-mdi-close-circle-outline"
              icon-tone="rose"
            >
              <template #value>
                {{ inactiveCount }}
              </template>
              {{ $t('public.friendLinks.inactiveCount') }}
            </CommonHeroStatCard>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.links-hero {
  border-bottom: 1px solid var(--ui-border);
  margin-bottom: 16px;
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
  justify-content: center;
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

@media (min-width: 1024px) {
  .links-hero__layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    grid-template-areas: "copy aside";
    gap: 36px;
    align-items: stretch;
  }

}
</style>
