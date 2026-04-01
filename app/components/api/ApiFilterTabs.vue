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
    class="api-filter-tabs mb-4 flex flex-wrap gap-2"
  >
    <UiButton
      v-for="tab in visibleTabs"
      :key="String(tab.value)"
      :variant="isActive(tab.value) ? 'default' : 'outline'"
      size="sm"
      class="api-filter-tab h-8 rounded-full px-3.5 text-xs font-medium sm:text-sm"
      :class="isActive(tab.value)
        ? 'shadow-xs'
        : 'bg-card text-muted-foreground hover:bg-accent/70 hover:text-foreground'"
      @click="selectTab(tab.value)"
    >
      {{ tab.label }}
    </UiButton>

    <UiButton
      v-if="hasOverflow"
      variant="outline"
      size="sm"
      class="api-filter-tab h-8 rounded-full px-3 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground sm:text-sm"
      @click="toggleExpanded"
    >
      {{ expanded ? '收起' : `更多(${hiddenCount})` }}
    </UiButton>
  </section>
</template>
