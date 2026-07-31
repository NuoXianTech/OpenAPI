<script setup lang="ts">
interface DashboardContentCardProps {
  title: string
  description?: string
  icon?: string
  bodyClass?: string
}

withDefaults(defineProps<DashboardContentCardProps>(), {
  description: undefined,
  icon: undefined,
  bodyClass: undefined
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <UCard
    v-bind="$attrs"
    class="dashboard-content-card"
    variant="subtle"
    :ui="{
      root: 'divide-y-0',
      header: 'dashboard-content-card-header',
      body: ['dashboard-content-card-body', bodyClass],
      footer: 'dashboard-content-card-footer'
    }"
  >
    <template #header>
      <slot name="header">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            v-if="icon"
            class="dashboard-content-card-icon"
          >
            <UIcon
              :name="icon"
              class="size-4.5"
            />
          </span>

          <div class="min-w-0">
            <h3 class="text-sm font-semibold leading-5 text-highlighted sm:text-base">
              {{ title }}
            </h3>
            <p
              v-if="description"
              class="mt-0.5 text-xs leading-5 text-muted"
            >
              {{ description }}
            </p>
          </div>
        </div>

        <div
          v-if="$slots.actions"
          class="dashboard-content-card-actions"
        >
          <slot name="actions" />
        </div>
      </slot>
    </template>

    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UCard>
</template>

<style scoped>
.dashboard-content-card {
  overflow: hidden;
  border-color: var(--dashboard-border);
  border-radius: var(--dashboard-radius);
  background: var(--dashboard-surface);
  box-shadow:
    0 1px 2px color-mix(in oklab, var(--ui-text) 5%, transparent),
    0 16px 34px -34px color-mix(in oklab, var(--ui-text) 22%, transparent);
}

.dashboard-content-card :deep(.dashboard-content-card-header) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid var(--dashboard-border);
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--dashboard-surface-muted) 54%, var(--dashboard-surface)) 0%,
      color-mix(in oklab, var(--dashboard-surface-muted) 24%, var(--dashboard-surface)) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 54%, transparent);
}

.dashboard-content-card :deep(.dashboard-content-card-icon) {
  display: grid;
  width: 1.875rem;
  height: 1.875rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--dashboard-border);
  border-radius: 0.5rem;
  background: color-mix(in oklab, var(--dashboard-surface-muted) 72%, var(--dashboard-surface));
  color: var(--ui-text-toned);
}

.dashboard-content-card :deep(.dashboard-content-card-actions) {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.dashboard-content-card :deep(.dashboard-content-card-body) {
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--dashboard-surface) 96%, var(--dashboard-surface-muted) 4%) 0%,
      var(--dashboard-surface) 10rem
    );
}

.dashboard-content-card :deep(.dashboard-content-card-footer) {
  border-top: 1px solid var(--dashboard-border);
  background: color-mix(in oklab, var(--dashboard-surface-muted) 34%, var(--dashboard-surface));
}

:global(.dark) .dashboard-content-card :deep(.dashboard-content-card-header) {
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 7%, transparent);
}

@media (width >= 640px) {
  .dashboard-content-card :deep(.dashboard-content-card-header) {
    padding-inline: 1rem;
  }
}
</style>
