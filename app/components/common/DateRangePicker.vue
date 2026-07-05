<script setup lang="ts">
import { CalendarDate, CalendarDateTime, Time, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'

/**
 * 「日期时间区间」选择器：左侧快捷预设 + 右侧双月日历 + 起止时间。
 *
 * 对外暴露 `start` / `end` 两个字符串 model（`YYYY-MM-DDTHH:mm`，与
 * datetime-local 同格式），用于替换日志筛选等「开始 / 结束时间」成对输入。
 */
const props = withDefaults(defineProps<{
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  clearable?: boolean
  icon?: string
  block?: boolean
}>(), {
  placeholder: '选择时间范围',
  size: 'md',
  disabled: false,
  clearable: true,
  icon: 'i-lucide-calendar',
  block: true
})

const start = defineModel<string>('start', { default: '' })
const end = defineModel<string>('end', { default: '' })

const open = ref(false)
const tz = getLocalTimeZone()

const labelFormatter = new DateFormatter('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

const startDate = ref<CalendarDate>()
const startTime = ref<Time>()
const endDate = ref<CalendarDate>()
const endTime = ref<Time>()

watch([start, end], ([nextStart, nextEnd]) => {
  const s = dateTimeLocalToCalendar(nextStart)
  const e = dateTimeLocalToCalendar(nextEnd)
  startDate.value = s ? new CalendarDate(s.year, s.month, s.day) : undefined
  startTime.value = s ? new Time(s.hour, s.minute) : undefined
  endDate.value = e ? new CalendarDate(e.year, e.month, e.day) : undefined
  endTime.value = e ? new Time(e.hour, e.minute) : undefined
}, { immediate: true })

function toLocal(date: CalendarDate | undefined, time: Time | undefined, fallbackTime: Time) {
  if (!date) return ''
  const t = time ?? fallbackTime
  return calendarToDateTimeLocal(new CalendarDateTime(date.year, date.month, date.day, t.hour, t.minute))
}

// 区间默认起点取当天 00:00、终点取当天 23:59，符合「整天范围」直觉
function commit() {
  start.value = toLocal(startDate.value, startTime.value, new Time(0, 0))
  end.value = toLocal(endDate.value, endTime.value, new Time(23, 59))
}

const rangeProxy = computed({
  get: () => ({ start: startDate.value, end: endDate.value }),
  set: (range: { start: CalendarDate | null, end: CalendarDate | null }) => {
    startDate.value = range.start ?? undefined
    endDate.value = range.end ?? undefined
    if (range.start && !startTime.value) startTime.value = new Time(0, 0)
    if (range.end && !endTime.value) endTime.value = new Time(23, 59)
    commit()
  }
})

const startTimeProxy = computed({
  get: () => startTime.value ?? new Time(0, 0),
  set: (next: Time) => {
    startTime.value = next
    commit()
  }
})

const endTimeProxy = computed({
  get: () => endTime.value ?? new Time(23, 59),
  set: (next: Time) => {
    endTime.value = next
    commit()
  }
})

const displayLabel = computed(() => {
  const s = dateTimeLocalToCalendar(start.value)
  const e = dateTimeLocalToCalendar(end.value)
  if (!s) return ''
  const startText = labelFormatter.format(s.toDate(tz))
  return e ? `${startText} ~ ${labelFormatter.format(e.toDate(tz))}` : startText
})

interface RangePreset {
  label: string
  days?: number
  months?: number
  years?: number
}

const presets: RangePreset[] = [
  { label: '最近 7 天', days: 7 },
  { label: '最近 14 天', days: 14 },
  { label: '最近 30 天', days: 30 },
  { label: '最近 3 个月', months: 3 },
  { label: '最近 6 个月', months: 6 },
  { label: '最近 1 年', years: 1 }
]

function presetStart(preset: RangePreset) {
  const base = today(tz)
  if (preset.days) return base.subtract({ days: preset.days })
  if (preset.months) return base.subtract({ months: preset.months })
  if (preset.years) return base.subtract({ years: preset.years })
  return base
}

function isPresetActive(preset: RangePreset) {
  if (!startDate.value || !endDate.value) return false
  return startDate.value.compare(presetStart(preset)) === 0
    && endDate.value.compare(today(tz)) === 0
}

function applyPreset(preset: RangePreset) {
  startDate.value = presetStart(preset)
  endDate.value = today(tz)
  startTime.value = new Time(0, 0)
  endTime.value = new Time(23, 59)
  commit()
}

function clear() {
  startDate.value = undefined
  startTime.value = undefined
  endDate.value = undefined
  endTime.value = undefined
  start.value = ''
  end.value = ''
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
            name="i-lucide-x"
            class="size-4 text-dimmed hover:text-default transition-colors"
            role="button"
            tabindex="-1"
            aria-label="清除"
            @click.stop="clear"
          />
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 shrink-0 text-dimmed transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </span>
      </template>
    </UButton>

    <template #content>
      <div class="flex items-stretch divide-default sm:divide-x">
        <div class="hidden flex-col py-2 sm:flex">
          <UButton
            v-for="preset in presets"
            :key="preset.label"
            :label="preset.label"
            color="neutral"
            variant="ghost"
            class="rounded-none px-4 font-normal"
            :class="isPresetActive(preset) ? 'bg-elevated' : 'hover:bg-elevated/50'"
            truncate
            @click="applyPreset(preset)"
          />
        </div>

        <div class="flex flex-col">
          <UCalendar
            v-model="rangeProxy"
            class="p-2"
            :number-of-months="2"
            range
          />

          <div class="flex items-center gap-2 border-t border-default p-2">
            <UIcon
              name="i-lucide-clock"
              class="size-4 shrink-0 text-dimmed"
            />
            <UInputTime
              v-model="startTimeProxy"
              :hour-cycle="24"
              size="sm"
              class="flex-1"
            />
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 shrink-0 text-dimmed"
            />
            <UInputTime
              v-model="endTimeProxy"
              :hour-cycle="24"
              size="sm"
              class="flex-1"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
