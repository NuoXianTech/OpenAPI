import type { InjectionKey } from 'vue'
import type { DashboardConfig } from '~/constants/dashboard-config'

// 已带 brand 求值后的运行时配置（DashboardLayoutBase 注入）
export type ResolvedDashboardConfig = Omit<DashboardConfig, 'brand'> & {
  brand: ReturnType<DashboardConfig['brand']>
}

export const dashboardConfigInjectionKey = Symbol('dashboardConfig') as InjectionKey<ResolvedDashboardConfig>

export function useDashboardConfig(): ResolvedDashboardConfig {
  const config = inject(dashboardConfigInjectionKey)
  if (!config) {
    throw new Error('useDashboardConfig() must be used inside <DashboardLayoutBase>')
  }
  return config
}
