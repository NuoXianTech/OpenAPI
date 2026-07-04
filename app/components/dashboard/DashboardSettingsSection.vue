<script setup lang="ts">
interface DashboardSettingsSectionProps {
  title: string
  description?: string
}

defineProps<DashboardSettingsSectionProps>()
</script>

<template>
  <section class="dashboard-settings-section">
    <div class="dashboard-settings-section-header">
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
    </div>

    <div class="dashboard-settings-section-card">
      <slot />
    </div>
  </section>
</template>
