<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
}>()
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-2 px-1">
        <UIcon
          :name="icon"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          {{ title }}
        </h3>
      </div>
      <p
        v-if="description"
        class="mt-1 px-1 text-xs text-muted"
      >
        {{ description }}
      </p>
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
