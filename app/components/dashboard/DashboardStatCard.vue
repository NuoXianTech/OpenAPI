<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  value: string | number
  icon: string
  iconColor?: string
  to?: RouteLocationRaw
  hint?: string
  trend?: number | null
}>()
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="block"
  >
    <UCard
      :ui="{ body: 'p-4 sm:p-5' }"
      :class="to ? 'h-full transition-all hover:border-primary/40 hover:shadow' : 'h-full'"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm text-muted">
            {{ label }}
          </p>
          <p class="mt-1 truncate text-2xl font-semibold tabular-nums">
            {{ value }}
          </p>
          <p
            v-if="hint || trend !== undefined && trend !== null"
            class="mt-1 truncate text-xs text-muted"
          >
            <span
              v-if="trend !== undefined && trend !== null"
              :class="trend >= 0 ? 'text-success' : 'text-error'"
              class="mr-1 inline-flex items-center gap-0.5"
            >
              <UIcon
                :name="trend >= 0 ? 'i-mdi-trending-up' : 'i-mdi-trending-down'"
                class="size-3.5"
              />
              {{ trend >= 0 ? '+' : '' }}{{ trend.toFixed(1) }}%
            </span>
            {{ hint }}
          </p>
        </div>
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
          <UIcon
            :name="icon"
            :class="iconColor || 'text-primary'"
            class="size-5"
          />
        </div>
      </div>
    </UCard>
  </component>
</template>
