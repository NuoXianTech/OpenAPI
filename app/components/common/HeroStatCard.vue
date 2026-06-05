<script lang="ts" setup>
type IconTone = 'primary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'

const { icon = '', iconTone = 'neutral', loading = false, valueTitle, labelTitle } = defineProps<{
  icon?: string
  iconTone?: IconTone
  loading?: boolean
  valueTitle?: string
  labelTitle?: string
}>()
</script>

<template>
  <div class="hero-stat-card">
    <template v-if="loading">
      <USkeleton class="mb-1 size-[26px] rounded-md" />
      <USkeleton class="h-6 w-20 rounded-md" />
      <USkeleton class="mt-1 h-3 w-14 rounded-md" />
    </template>
    <template v-else>
      <div
        class="hero-stat-card__icon"
        :class="`is-${iconTone}`"
      >
        <UIcon
          :name="icon"
          class="size-4"
        />
      </div>
      <div
        class="hero-stat-card__value"
        :title="valueTitle"
      >
        <slot name="value" />
      </div>
      <div
        class="hero-stat-card__label"
        :title="labelTitle"
      >
        <slot />
      </div>
    </template>
  </div>
</template>

<style scoped>
.hero-stat-card {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 12px 14px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 8%) 0%,
      color-mix(in srgb, var(--ui-bg) 82%, transparent) 100%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 40%, transparent);
  backdrop-filter: blur(8px);
  transition: transform 220ms ease, border-color 220ms ease;
}

.hero-stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--ui-border-accented);
}

.dark .hero-stat-card {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg) 72%, white 5%) 0%,
      color-mix(in srgb, var(--ui-bg) 86%, transparent) 100%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
}

.hero-stat-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ui-text) 7%, transparent);
  color: var(--ui-text-muted);
}

.hero-stat-card__icon.is-primary {
  background: color-mix(in srgb, var(--ui-primary) 10%, transparent);
  color: var(--ui-text);
}

.hero-stat-card__icon.is-info {
  background: color-mix(in srgb, var(--ui-info) 13%, transparent);
  color: var(--ui-info);
}

.hero-stat-card__icon.is-success {
  background: color-mix(in srgb, var(--ui-success) 13%, transparent);
  color: var(--ui-success);
}

.hero-stat-card__icon.is-warning {
  background: color-mix(in srgb, var(--ui-warning) 15%, transparent);
  color: var(--ui-warning);
}

.hero-stat-card__icon.is-error {
  background: color-mix(in srgb, var(--ui-error) 13%, transparent);
  color: var(--ui-error);
}

.hero-stat-card__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
}

.hero-stat-card__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--ui-text-muted);
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .hero-stat-card__value {
    font-size: 18px;
  }

  .hero-stat-card__icon {
    width: 22px;
    height: 22px;
  }
}
</style>
