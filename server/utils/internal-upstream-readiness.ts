interface InternalTargetState {
  enabled: boolean
  configurationRevision: number | null
  configurationHash: string | null
  configurationStatus: string
  configurationState: unknown | null
}

interface InternalConnectionState {
  configurationRevision: number
  configurationHash: string | null
}

export function isInternalTargetReady(
  target: InternalTargetState,
  connection: InternalConnectionState | null
): boolean {
  if (!target.enabled || !target.configurationState || !connection) {
    return false
  }
  if (!connection.configurationHash) {
    return target.configurationStatus !== 'error'
  }
  return target.configurationStatus === 'synced'
    && target.configurationRevision === connection.configurationRevision
    && target.configurationHash === connection.configurationHash
}

export function areEnabledInternalTargetsReady(
  targets: readonly InternalTargetState[],
  connection: InternalConnectionState | null
): boolean {
  const enabledTargets = targets.filter(target => target.enabled)
  return enabledTargets.length > 0
    && enabledTargets.every(target => isInternalTargetReady(
      target,
      connection
    ))
}
