<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
}>(), {
  icon: 'i-mdi-inbox-outline',
  title: '暂无数据'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon
      :name="icon"
      class="size-10 text-muted/60"
    />
    <div>
      <p class="text-sm font-medium">
        {{ title }}
      </p>
      <p
        v-if="description"
        class="mt-1 text-xs text-muted"
      >
        {{ description }}
      </p>
    </div>
    <slot name="actions" />
  </div>
</template>
