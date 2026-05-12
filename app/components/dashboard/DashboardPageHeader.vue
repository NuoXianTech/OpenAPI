<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
}>()
</script>

<template>
  <UCard>
    <div class="flex items-center gap-4">
      <span class="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UIcon
          :name="icon"
          class="size-6"
        />
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-lg font-semibold">
          {{ title }}
        </div>
        <div
          v-if="description || $slots.description"
          class="text-sm text-muted"
        >
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>
      <div
        v-if="$slots.actions"
        class="shrink-0"
      >
        <slot name="actions" />
      </div>
    </div>
  </UCard>
</template>
