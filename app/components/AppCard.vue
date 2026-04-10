<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: false },
  status: { type: Number, default: -1 },
  isApiKey: { type: Boolean, default: false },
  initialExpanded: { type: Boolean, default: false },
})

const isExpanded = ref(props.initialExpanded)
const toggle = () => {
  isExpanded.value = !isExpanded.value
}

const getStatusInfo = (status: number) => {
  const STATUS_UNKNOWN_CLASS = 'status-unknown'
  switch (status) {
    case -1:
      return { class: STATUS_UNKNOWN_CLASS, text: '未知' }
    case 0:
      return { class: 'status-error', text: '异常' }
    case 1:
      return { class: 'status-normal', text: '正常' }
    case 2:
      return { class: STATUS_UNKNOWN_CLASS, text: '维护' }
    case 3:
      return { class: STATUS_UNKNOWN_CLASS, text: '废弃' }
    default:
      return { class: STATUS_UNKNOWN_CLASS, text: '未知' }
  }
}
</script>

<template>
  <Card class="card-enter col-span-12 gap-0 border-border bg-card py-4 shadow-sm transition-all duration-300 sm:col-span-6 lg:col-span-4">
    <CardHeader class="px-4 pb-0">
      <div class="flex items-center justify-between gap-2">
        <CardTitle class="m-0 flex-1 text-base font-semibold tracking-wide">
          <slot name="header">
            {{ title }}
          </slot>
        </CardTitle>

        <div class="flex items-center gap-2">
          <div
            class="radar-core"
            :class="getStatusInfo(props.status).class"
            :title="getStatusInfo(props.status).text"
          />
          <slot name="header-actions" />
        </div>
      </div>
    </CardHeader>

    <CardContent class="px-4 pt-2">
      <slot name="summary" />
    </CardContent>

    <div class="mt-2 flex w-full items-center justify-between gap-2 px-4">
      <slot name="meta" />

      <Button
        variant="outline"
        size="sm"
        class="ml-auto h-8 rounded-md px-3 text-xs"
        :aria-expanded="isExpanded"
        @click="toggle"
      >
        <Icon
          name="mdi:chevron-right"
          size="16"
          :class="isExpanded ? 'rotate-90' : ''"
          :ssr="true"
        />
        <span>
          <slot name="toggle-text">{{ isExpanded ? '收起详情' : '查看详情' }}</slot>
        </span>
      </Button>
    </div>

    <div
      class="overflow-hidden border-t border-dashed px-4 transition-all duration-300 ease-in-out"
      :class="isExpanded ? 'mt-3 max-h-125 border-border pt-3 opacity-100' : 'mt-0 max-h-0 border-transparent pt-0 opacity-0'"
    >
      <slot name="details" />
    </div>
  </Card>
</template>
<!-- TODO: 通用Card组件 -->
