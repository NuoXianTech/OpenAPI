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
  <section class="flex flex-wrap gap-3 mt-4 mb-3">
    <input
      id="searchInput"
      type="search"
      :placeholder="props.placeholder"
      :value="props.modelValue"
      @input="onInput"
      class="appearance-none outline-none rounded-[10px] border border-border bg-white text-[#111113] px-3 py-2.5 min-h-[40px] text-base flex-[1_1_260px] transition-all duration-200 focus:border-[#8ab4ff] focus:shadow-[0_0_0_3px_rgba(138,180,255,0.25)]"
    />
  </section>
</template>
