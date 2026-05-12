<script setup lang="ts">
withDefaults(defineProps<{
  cols?: 2 | 3 | 4
}>(), {
  cols: 4,
})
</script>

<template>
  <div
    class="grid gap-4"
    :class="{
      'sm:grid-cols-2': cols >= 2,
      'lg:grid-cols-3': cols === 3,
      'lg:grid-cols-4': cols === 4,
    }"
  >
    <slot />
  </div>
</template>
