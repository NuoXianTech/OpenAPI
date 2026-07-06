<script setup lang="ts">
import { CalendarDate, CalendarDateTime, Time, DateFormatter, getLocalTimeZone, now, toCalendarDate } from '@internationalized/date'

/**
 * 统一的「日期 + 时间」选择器，取代浏览器原生 `type="datetime-local"`。
 *
 * 对外保持纯字符串契约（`YYYY-MM-DDTHH:mm`，与 datetime-local 同格式），
 * 因此可直接 drop-in 替换原 `<UInput type="datetime-local">`，消费方
 * `new Date(value)` 的本地时间解析逻辑零改动。
 */
const props = withDefaults(defineProps<{
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  clearable?: boolean
  icon?: string
  /** 触发按钮是否撑满容器宽度 */
  block?: boolean
}>(), {
  placeholder: '选择日期时间',
  size: 'md',
  disabled: false,
  clearable: true,
  icon: 'i-mdi-calendar-outline',
  block: true
})

const value = defineModel<string>({ default: '' })

const open = ref(false)
const tz = getLocalTimeZone()

const labelFormatter = new DateFormatter('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

// 字符串 → 日历态（拆成日期、时间两段分别驱动 UCalendar / UInputTime）
const calendarDate = ref<CalendarDate>()
const time = ref<Time>()

watch(value, (next) => {
  const dt = dateTimeLocalToCalendar(next)
  calendarDate.value = dt ? new CalendarDate(dt.year, dt.month, dt.day) : undefined
  time.value = dt ? new Time(dt.hour, dt.minute) : undefined
}, { immediate: true })

function commit() {
  if (!calendarDate.value) {
    value.value = ''
    return
  }
  const t = time.value ?? new Time(0, 0)
  value.value = calendarToDateTimeLocal(new CalendarDateTime(
    calendarDate.value.year,
    calendarDate.value.month,
    calendarDate.value.day,
    t.hour,
    t.minute
  ))
}

const calendarProxy = computed({
  get: () => calendarDate.value,
  set: (next: CalendarDate | undefined) => {
    calendarDate.value = next ?? undefined
    if (next && !time.value) time.value = new Time(0, 0)
    commit()
  }
})

const timeProxy = computed({
  get: () => time.value ?? new Time(0, 0),
  set: (next: Time) => {
    time.value = next
    if (!calendarDate.value) calendarDate.value = toCalendarDate(now(tz))
    commit()
  }
})

const displayLabel = computed(() => {
  const dt = dateTimeLocalToCalendar(value.value)
  return dt ? labelFormatter.format(dt.toDate(tz)) : ''
})

function setNow() {
  const current = now(tz)
  calendarDate.value = toCalendarDate(current)
  time.value = new Time(current.hour, current.minute)
  commit()
}

function clear() {
  calendarDate.value = undefined
  time.value = undefined
  value.value = ''
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{ content: 'w-auto' }"
  >
    <UButton
      color="neutral"
      variant="outline"
      :size="props.size"
      :disabled="props.disabled"
      :icon="props.icon"
      :block="props.block"
      class="data-[state=open]:bg-elevated group justify-start font-normal"
      :class="{ 'text-dimmed': !displayLabel }"
    >
      <span class="truncate">{{ displayLabel || props.placeholder }}</span>

      <template #trailing>
        <span class="ms-auto flex items-center gap-1">
          <UIcon
            v-if="props.clearable && displayLabel && !props.disabled"
            name="i-mdi-close"
            class="size-4 text-dimmed hover:text-default transition-colors"
            role="button"
            tabindex="-1"
            aria-label="清除"
            @click.stop="clear"
          />
          <UIcon
            name="i-mdi-chevron-down"
            class="size-4 shrink-0 text-dimmed transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </span>
      </template>
    </UButton>

    <template #content>
      <div class="flex flex-col">
        <UCalendar
          v-model="calendarProxy"
          class="p-2"
        />

        <div class="flex items-center gap-2 border-t border-default p-2">
          <UIcon
            name="i-mdi-clock-outline"
            class="size-4 shrink-0 text-dimmed"
          />
          <UInputTime
            v-model="timeProxy"
            :hour-cycle="24"
            size="sm"
            class="flex-1"
          />
          <UButton
            label="此刻"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="setNow"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
