<script lang="ts" setup>
import type { ApiTabOption } from '~/composables/api/types'

const props = withDefaults(defineProps<{
  modelValue: string | number
  tabs: ApiTabOption[]
  ariaLabel?: string
}>(), {
  ariaLabel: '筛选标签',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function isActive(value: string | number) {
  return String(value) === String(props.modelValue)
}

function selectTab(value: string | number) {
  emit('update:modelValue', value)
}
</script>

<template>
  <section
    :aria-label="props.ariaLabel"
    class="flex flex-wrap gap-2 mb-4 api-filter-tabs"
  >
    <button
      v-for="tab in props.tabs"
      :key="String(tab.value)"
      type="button"
      class="api-filter-tab px-3.5 py-1.5 rounded-lg text-sm border transition-all duration-200 cursor-pointer select-none font-medium"
      :class="isActive(tab.value)
        ? 'bg-[#111113] text-white border-[#111113]'
        : 'bg-surface border-border text-muted hover:text-text hover:border-muted/50'"
      @click="selectTab(tab.value)"
    >
      {{ tab.label }}
    </button>
  </section>
</template>