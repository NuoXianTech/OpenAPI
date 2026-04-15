<script lang="ts" setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索 API 名称或描述...' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <section class="mt-4 mb-3">
    <UInput
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      icon="mdi:magnify"
      size="md"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </section>
</template>
