<script setup lang="ts">
interface AdminFilterPopoverProps {
  activeCount?: number
  buttonLabel?: string
  panelClass?: string
  title?: string
}

const props = withDefaults(defineProps<AdminFilterPopoverProps>(), {
  activeCount: 0,
  buttonLabel: '筛选',
  panelClass: 'w-72 p-3 sm:w-80',
  title: '筛选条件'
})

const emit = defineEmits<{
  apply: []
  reset: []
}>()

const open = ref(false)

const displayLabel = computed(() => {
  return props.activeCount > 0 ? `${props.activeCount} 项筛选` : props.buttonLabel
})

function closePopover() {
  open.value = false
}

function applyFilters() {
  emit('apply')
  closePopover()
}

function resetFilters() {
  emit('reset')
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'p-0' }"
  >
    <UButton
      icon="i-mdi-filter-variant"
      trailing-icon="i-mdi-chevron-down"
      :color="props.activeCount > 0 ? 'primary' : 'neutral'"
      :variant="props.activeCount > 0 ? 'soft' : 'outline'"
      class="w-full justify-center sm:w-auto"
      :ui="{ label: 'truncate' }"
    >
      {{ displayLabel }}
    </UButton>

    <template #content>
      <div :class="props.panelClass">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <UIcon
              name="i-mdi-filter-variant"
              class="size-4 shrink-0 text-muted"
            />
            <span class="truncate text-sm font-medium text-highlighted">{{ props.title }}</span>
          </div>
          <UBadge
            v-if="props.activeCount > 0"
            color="primary"
            variant="subtle"
            size="sm"
          >
            {{ props.activeCount }}
          </UBadge>
        </div>

        <div class="space-y-3">
          <slot />
        </div>

        <div class="mt-4 flex items-center justify-end gap-2 border-t border-default pt-3">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="props.activeCount === 0"
            @click="resetFilters"
          >
            重置
          </UButton>
          <UButton
            size="sm"
            @click="applyFilters"
          >
            完成
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
