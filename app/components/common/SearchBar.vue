<script setup lang="ts">
interface Props {
  modelValue?: string
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索 API 名称或描述...',
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

type InputExpose = {
  inputRef?: HTMLInputElement | { value: HTMLInputElement | null } | null
}

const inputComp = ref<InputExpose | null>(null)

const getInputElement = () => {
  const inputRef = inputComp.value?.inputRef
  if (!inputRef) return null
  if ('focus' in inputRef) return inputRef
  return inputRef.value
}

const focusInput = () => {
  getInputElement()?.focus()
}

const handleInput = (value: string | number) => {
  emit('update:modelValue', String(value ?? ''))
}

const clear = () => {
  emit('update:modelValue', '')
  focusInput()
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    event.preventDefault()
    clear()
  }
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

const onGlobalKey = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  if (isEditableTarget(event.target)) return
  event.preventDefault()
  focusInput()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKey)
})
</script>

<template>
  <UInput
    ref="inputComp"
    :model-value="props.modelValue"
    :placeholder="props.placeholder"
    :size="props.size"
    icon="i-mdi-magnify"
    color="neutral"
    variant="outline"
    class="w-full"
    autocomplete="off"
    @update:model-value="handleInput"
    @keydown="onKeydown"
  >
    <template #trailing>
      <UButton
        v-if="props.modelValue"
        color="neutral"
        variant="link"
        size="sm"
        icon="i-mdi-close"
        aria-label="清除搜索"
        @click="clear"
      />
      <UKbd
        v-else
        class="searchbar-shortcut"
      >
        /
      </UKbd>
    </template>
  </UInput>
</template>

<style scoped>
.searchbar-shortcut {
  display: none;
}

@media (min-width: 640px) {
  .searchbar-shortcut {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ui-text-muted);
  }
}
</style>
