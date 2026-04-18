import { oauthProviderService } from '~~/server/service/oauthProviderService'

export default defineEventHandler(async () => {
  const list = await oauthProviderService.listEnabledPublic()
  return {
    code: 0,
    msg: 'ok',
    data: list.map((item: { provider: string, displayName: string, icon: string | null, sortOrder: number }) => ({
      provider: item.provider,
      displayName: item.displayName,
      icon: item.icon,
      authorizeEntry: `/api/auth/oauth/${item.provider}/start`,
    })),
  }
})
