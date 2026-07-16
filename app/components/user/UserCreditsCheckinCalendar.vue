<script setup lang="ts">
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'
import type { UserCheckinCalendarMonth } from '#shared/types/user-credits'

interface UserCreditsCheckinCalendarProps {
  history: UserCheckinCalendarMonth | null
  loading: boolean
  onMonthChange: (month: string) => Promise<unknown>
}

const props = defineProps<UserCreditsCheckinCalendarProps>()

const now = new Date()
const today = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
const placeholder = shallowRef<DateValue>(new CalendarDate(today.year, today.month, 1))

const checkedDates = computed<DateValue[]>(() =>
  (props.history?.days ?? []).map(day => parseDate(day.date))
)
const checkedDayNumbers = computed(() => new Set(
  (props.history?.days ?? []).map(day => Number(day.date.slice(-2)))
))
const checkedDayCount = computed(() => props.history?.checkedDayCount ?? 0)
const totalAmount = computed(() => props.history?.totalAmount ?? 0)

const visibleMonth = computed(() => toMonthKey(placeholder.value))

onMounted(() => {
  void props.onMonthChange(visibleMonth.value)
})

watch(visibleMonth, (month, previousMonth) => {
  if (month === previousMonth) return
  void props.onMonthChange(month)
})

function toMonthKey(date: DateValue): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}`
}

function isCheckedDay(day: DateValue): boolean {
  return props.history?.month === visibleMonth.value
    && day.year === placeholder.value.year
    && day.month === placeholder.value.month
    && checkedDayNumbers.value.has(day.day)
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            name="i-mdi-calendar-month-outline"
            class="size-5 shrink-0 text-muted"
          />
          <div>
            <h3 class="text-lg font-semibold text-highlighted">
              签到日历
            </h3>
            <p class="mt-0.5 text-xs text-muted">
              切换月份可查看历史签到日期
            </p>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <UBadge
            color="success"
            variant="subtle"
          >
            {{ checkedDayCount }} 天
          </UBadge>
          <UBadge
            color="primary"
            variant="subtle"
          >
            +{{ totalAmount.toLocaleString() }} 积分
          </UBadge>
        </div>
      </div>
    </template>

    <div class="relative py-1">
      <UCalendar
        v-model:placeholder="placeholder"
        multiple
        readonly
        fixed-weeks
        disable-days-outside-current-view
        :model-value="checkedDates"
        :max-value="today"
        :view-control="false"
        class="w-full"
        :ui="{
          root: 'w-full',
          body: 'w-full',
          grid: 'w-full',
          cellTrigger: 'relative w-full transition-none hover:not-data-selected:bg-transparent data-highlighted:bg-transparent data-selected:bg-transparent data-selected:text-inherit data-selected:ring-0 data-selected:shadow-none'
        }"
      >
        <template #day="{ day }">
          <span
            class="flex size-8 items-center justify-center rounded-md sm:size-9"
            :class="isCheckedDay(day) ? 'bg-success/15 font-semibold text-success ring-1 ring-success/25' : ''"
          >
            {{ day.day }}
          </span>
        </template>
      </UCalendar>

      <div
        v-if="loading"
        class="pointer-events-none absolute right-2 top-2"
      >
        <div class="flex items-center gap-1.5 rounded-md bg-default/90 px-2 py-1 text-xs text-muted ring-1 ring-default">
          <UIcon
            name="i-mdi-loading"
            class="size-4 animate-spin"
          />
          加载中
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-center gap-4 border-t border-default pt-3 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5">
        <span class="size-3 rounded-sm bg-success/15 ring-1 ring-success/25" />
        已签到
      </span>
      <span>当月累计签到 {{ checkedDayCount }} 天</span>
    </div>
  </UCard>
</template>
