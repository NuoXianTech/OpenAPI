<script setup lang="ts">
interface DashboardSettingsSectionProps {
  title: string
  description?: string
}

defineProps<DashboardSettingsSectionProps>()
</script>

<template>
  <section class="dashboard-settings-section">
    <UCard
      class="dashboard-settings-section-card"
      variant="subtle"
      :ui="{
        header: 'dashboard-settings-section-header',
        body: 'dashboard-settings-section-body p-0 sm:p-0',
        footer: 'dashboard-settings-section-footer p-0 sm:p-0'
      }"
    >
      <template #header>
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-highlighted sm:text-base">
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="mt-1 max-w-2xl text-sm text-muted"
          >
            {{ description }}
          </p>
        </div>

        <div
          v-if="$slots.actions"
          class="dashboard-settings-section-actions"
        >
          <slot name="actions" />
        </div>
      </template>

      <slot />

      <template
        v-if="$slots.footer"
        #footer
      >
        <div class="dashboard-settings-section-footer-content">
          <slot name="footer" />
        </div>
      </template>
    </UCard>
  </section>
</template>

<style scoped>
.dashboard-settings-section {
  min-width: 0;
}

.dashboard-settings-section-card {
  overflow: hidden;
  border-color: var(--dashboard-border);
  border-radius: var(--dashboard-radius);
  background: var(--dashboard-surface);
  box-shadow:
    0 1px 2px color-mix(in oklab, var(--ui-text) 5%, transparent),
    0 18px 36px -34px color-mix(in oklab, var(--ui-text) 24%, transparent);
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-header) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--dashboard-surface-muted) 64%, var(--dashboard-surface)) 0%,
      color-mix(in oklab, var(--dashboard-surface-muted) 34%, var(--dashboard-surface)) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 58%, transparent);
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-actions) {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-body) {
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--dashboard-surface) 97%, var(--dashboard-surface-muted) 3%) 0%,
      var(--dashboard-surface) 9rem
    );
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-body > :where(:not([role="separator"]))) {
  padding: 0.875rem;
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-body > :where(:not([role="separator"])) + :where(:not([role="separator"]))) {
  border-top: 1px solid var(--dashboard-border);
}

.dashboard-settings-section-card :deep(.dashboard-settings-section-footer) {
  background: color-mix(in oklab, var(--dashboard-surface-muted) 54%, var(--dashboard-surface));
}

.dashboard-settings-section-footer-content {
  display: flex;
  width: 100%;
  min-height: 3.125rem;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
}

:global(.dark) .dashboard-settings-section-card :deep(.dashboard-settings-section-header) {
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 7%, transparent);
}

@media (width >= 640px) {
  .dashboard-settings-section-card :deep(.dashboard-settings-section-header) {
    padding-inline: 1rem;
  }

  .dashboard-settings-section-card :deep(.dashboard-settings-section-body > :where(:not([role="separator"]))) {
    padding: 0.875rem 1rem;
  }

  .dashboard-settings-section-footer-content {
    padding-inline: 1rem;
  }
}

@media (width < 640px) {
  .dashboard-settings-section-footer-content {
    padding: 0.75rem 0.875rem;
  }

  .dashboard-settings-section-footer-content :deep(button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
