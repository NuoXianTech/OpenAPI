<script lang="ts" setup>
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

const inputComp = ref<{ inputRef: { value: HTMLInputElement | null } } | null>(null)

const focusInput = () => {
  inputComp.value?.inputRef?.value?.focus()
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

const onGlobalKey = (e: KeyboardEvent) => {
  if (e.key !== '/') return
  const tag = (document.activeElement as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  e.preventDefault()
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
