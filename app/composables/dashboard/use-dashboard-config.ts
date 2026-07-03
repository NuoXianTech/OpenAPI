import type { DashboardConfig } from '~/constants/dashboard-config'

// 已带 brand 求值后的运行时配置（DashboardLayoutBase 注入）。
// DashboardConfig.brand 是静态对象；构建期那侧的常量额外用 (siteName) => brand 包了一层，
// 给布局组件根据 siteSettings 注入站名后再 provide 出真正的 DashboardConfig。
export type ResolvedDashboardConfig = DashboardConfig

export const dashboardConfigInjectionKey = Symbol.for('dashboardConfig') as InjectionKey<ComputedRef<ResolvedDashboardConfig>>

export function useDashboardConfig(): ComputedRef<ResolvedDashboardConfig> {
  const config = inject(dashboardConfigInjectionKey)
  if (!config) {
    throw new Error('useDashboardConfig() must be used inside <DashboardLayoutBase>')
  }
  return config
}
