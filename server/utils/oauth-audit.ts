import type { OauthProviderRow } from '~~/server/services/oauth-provider-service'

export interface OauthProviderAuditChange {
  provider: string
  changedFields: string[]
  clientIdChanged?: boolean
  clientSecretChanged?: boolean
  isEnabled?: {
    from: boolean
    to: boolean
  }
}

export interface OauthSettingsAuditDetail extends Record<string, unknown> {
  changes: {
    forceBinding?: {
      from: boolean
      to: boolean
    }
    providers: OauthProviderAuditChange[]
  }
}

export function createOauthSettingsAuditDetail(
  beforeForceBinding: boolean,
  beforeProviders: OauthProviderRow[],
  afterForceBinding: boolean,
  afterProviders: OauthProviderRow[]
): OauthSettingsAuditDetail | null {
  const previousByProvider = new Map(beforeProviders.map(provider => [provider.provider, provider]))
  const providerChanges: OauthProviderAuditChange[] = []

  for (const next of afterProviders) {
    const previous = previousByProvider.get(next.provider)
    if (!previous) continue

    const changedFields: string[] = []
    const change: OauthProviderAuditChange = {
      provider: next.provider,
      changedFields
    }

    if (previous.clientId !== next.clientId) {
      changedFields.push('clientId')
      change.clientIdChanged = true
    }
    if (previous.clientSecret !== next.clientSecret) {
      changedFields.push('clientSecret')
      change.clientSecretChanged = true
    }
    if (previous.isEnabled !== next.isEnabled) {
      changedFields.push('isEnabled')
      change.isEnabled = { from: previous.isEnabled, to: next.isEnabled }
    }

    if (changedFields.length > 0) providerChanges.push(change)
  }

  const changes: OauthSettingsAuditDetail['changes'] = {
    providers: providerChanges
  }
  if (beforeForceBinding !== afterForceBinding) {
    changes.forceBinding = { from: beforeForceBinding, to: afterForceBinding }
  }

  return changes.forceBinding || providerChanges.length > 0 ? { changes } : null
}
