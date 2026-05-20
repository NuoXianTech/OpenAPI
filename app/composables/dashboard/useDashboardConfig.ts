import type { ComputedRef, InjectionKey } from 'vue'
import type { DashboardConfig } from '~/constants/dashboard-config'

// 已带 brand 求值后的运行时配置（DashboardLayoutBase 注入）
export type ResolvedDashboardConfig = Omit<DashboardConfig, 'brand'> & {
  brand: ReturnType<DashboardConfig['brand']>
}

export const dashboardConfigInjectionKey = Symbol('dashboardConfig') as InjectionKey<ComputedRef<ResolvedDashboardConfig>>

export function useDashboardConfig(): ComputedRef<ResolvedDashboardConfig> {
  const config = inject(dashboardConfigInjectionKey)
  if (!config) {
    throw new Error('useDashboardConfig() must be used inside <DashboardLayoutBase>')
  }
  return config
}
