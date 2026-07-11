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

onMounted(() => {
  void props.onMonthChange(toMonthKey(placeholder.value))
})

function toMonthKey(date: DateValue): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}`
}

function handlePlaceholderChange(date: DateValue) {
  placeholder.value = new CalendarDate(date.year, date.month, 1)
  void props.onMonthChange(toMonthKey(date))
}

function isCheckedDay(day: DateValue): boolean {
  return day.year === placeholder.value.year
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

    <div class="relative flex justify-center py-1">
      <UCalendar
        multiple
        readonly
        fixed-weeks
        disable-days-outside-current-view
        :model-value="checkedDates"
        :placeholder="placeholder"
        :max-value="today"
        :view-control="false"
        class="w-full max-w-md"
        :ui="{
          root: 'w-full',
          body: 'w-full',
          grid: 'w-full',
          cellTrigger: 'relative w-full'
        }"
        @update:placeholder="handlePlaceholderChange"
      >
        <template #day="{ day }">
          <span>{{ day.day }}</span>
          <UIcon
            v-if="isCheckedDay(day)"
            name="i-mdi-check-circle"
            class="absolute right-0.5 top-0.5 size-2.5 text-success"
          />
        </template>
      </UCalendar>

      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center rounded-lg bg-default/70 backdrop-blur-[1px]"
      >
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon
            name="i-mdi-loading"
            class="size-5 animate-spin"
          />
          正在加载签到记录
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-center gap-4 border-t border-default pt-3 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-success" />
        已签到
      </span>
      <span>当月累计签到 {{ checkedDayCount }} 天</span>
    </div>
  </UCard>
</template>
