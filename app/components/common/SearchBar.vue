<script lang="ts" setup>
import { defineEmits, defineProps } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索 API 名称或描述...' },
})

const emit = defineEmits(['update:modelValue'])

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', v)
}
</script>

<template>
  <section class="my-4">
    <label
      for="searchInput"
      class="sr-only"
    >{{ props.placeholder }}</label>

    <div class="relative flex-[1_1_260px]">
      <Icon
        name="mdi:magnify"
        size="16"
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        :ssr="true"
      />

      <input
        id="searchInput"
        type="search"
        :placeholder="props.placeholder"
        :value="props.modelValue"
        class="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 pl-9 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        @input="onInput"
      >
    </div>
  </section>
</template>
