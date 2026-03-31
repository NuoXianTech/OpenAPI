<script lang="ts" setup>
import type { ApiTabOption } from '~/composables/api/types'

const props = withDefaults(defineProps<{
  modelValue: string | number
  tabs: ApiTabOption[]
  ariaLabel?: string
  maxVisible?: number
  enableCollapse?: boolean
}>(), {
  ariaLabel: '筛选标签',
  maxVisible: 8,
  enableCollapse: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const expanded = ref(false)

function isActive(value: string | number) {
  return String(value) === String(props.modelValue)
}

function selectTab(value: string | number) {
  emit('update:modelValue', value)
}

const hasOverflow = computed(() => {
  return props.enableCollapse && props.tabs.length > props.maxVisible
})

const visibleTabs = computed(() => {
  if (!hasOverflow.value || expanded.value) {
    return props.tabs
  }

  const head = props.tabs.slice(0, props.maxVisible)
  const active = props.tabs.find(tab => isActive(tab.value))
  const hasActiveInHead = head.some(tab => isActive(tab.value))

  if (!active || hasActiveInHead || head.length === 0) {
    return head
  }

  if (head.length === 1) {
    return [active]
  }

  return [...head.slice(0, head.length - 1), active]
})

const hiddenCount = computed(() => {
  return Math.max(props.tabs.length - visibleTabs.value.length, 0)
})

watch(() => props.tabs, () => {
  expanded.value = false
})

function toggleExpanded() {
  if (!hasOverflow.value) {
    return
  }
  expanded.value = !expanded.value
}
</script>

<template>
  <section
    :aria-label="props.ariaLabel"
    class="flex flex-wrap gap-2 mb-4 api-filter-tabs"
  >
    <button
      v-for="tab in visibleTabs"
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

    <button
      v-if="hasOverflow"
      type="button"
      class="api-filter-tab px-3 py-1.5 rounded-lg text-sm border border-border bg-surface text-muted hover:text-text hover:border-muted/50"
      @click="toggleExpanded"
    >
      {{ expanded ? '收起' : `更多(${hiddenCount})` }}
    </button>
  </section>
</template>
