<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section class="dashboard-hero-surface relative overflow-hidden rounded-lg border border-default p-5 sm:p-6">
    <div class="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
          {{ title }}
        </h2>
        <p class="mt-1 text-sm text-toned">
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="flex flex-wrap gap-2"
      >
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
