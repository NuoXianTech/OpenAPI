<script setup lang="ts">
interface Props {
  totalCount?: number
  activeCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  activeCount: 0
})

const ratio = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.round((props.activeCount / props.totalCount) * 100)
})
const formattedRatio = computed(() => props.totalCount > 0 ? `${ratio.value}%` : '--')
</script>

<template>
  <header
    class="links-hero"
    aria-labelledby="friend-links-title"
  >
    <div class="links-hero__copy">
      <h1 id="friend-links-title">
        {{ $t('public.friendLinks.title') }}
      </h1>
      <p>{{ $t('public.friendLinks.description') }}</p>

      <div
        v-if="totalCount > 0"
        class="links-hero__availability"
      >
        <span>{{ $t('public.friendLinks.availability') }}</span>
        <code>{{ formattedRatio }}</code>
      </div>
    </div>

    <div
      class="links-hero__count"
      :aria-label="$t('public.friendLinks.collected')"
    >
      <strong>{{ totalCount }}</strong>
      <span>{{ $t('public.friendLinks.collected') }}</span>
    </div>
  </header>
</template>

<style scoped>
.links-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.links-hero__copy {
  min-width: 0;
}

.links-hero h1 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 650;
  line-height: 1.15;
}

.links-hero p {
  max-width: 42rem;
  margin: 0.75rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.9rem;
  line-height: 1.7;
}

.links-hero__availability {
  display: flex;
  width: fit-content;
  max-width: 100%;
  margin-top: 1.25rem;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--ui-border);
  border-radius: 7px;
  padding: 0.5rem 0.65rem;
  background: var(--ui-bg-muted);
}

.links-hero__availability span {
  color: var(--ui-text-dimmed);
  font-size: 0.68rem;
}

.links-hero__availability code {
  color: var(--ui-text-toned);
  font-size: 0.72rem;
}

.links-hero__count {
  display: flex;
  min-width: 7rem;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  padding-bottom: 0.25rem;
}

.links-hero__count strong {
  color: var(--ui-text-highlighted);
  font-family: var(--font-code);
  font-size: 2rem;
  font-weight: 650;
  line-height: 1;
}

.links-hero__count span {
  margin-top: 0.4rem;
  color: var(--ui-text-dimmed);
  font-size: 0.7rem;
}

@media (width < 640px) {
  .links-hero {
    align-items: flex-start;
  }

  .links-hero__count {
    display: none;
  }
}
</style>
