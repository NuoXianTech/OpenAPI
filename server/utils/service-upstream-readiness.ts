interface ServiceTargetState {
  enabled: boolean
  configurationRevision: number | null
  configurationHash: string | null
  configurationStatus: string
  configurationState: unknown | null
}

interface ServiceConnectionState {
  configurationRevision: number
  configurationHash: string | null
}

export function isServiceTargetReady(
  target: ServiceTargetState,
  connection: ServiceConnectionState | null
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

export function areEnabledServiceTargetsReady(
  targets: readonly ServiceTargetState[],
  connection: ServiceConnectionState | null
): boolean {
  const enabledTargets = targets.filter(target => target.enabled)
  return enabledTargets.length > 0
    && enabledTargets.every(target => isServiceTargetReady(target, connection))
}

/**
 * Routing only needs one verified enabled Target; the remaining Targets can
 * be temporarily degraded without taking an otherwise healthy Service out of
 * the published snapshot.
 */
export function hasReadyServiceTarget(
  targets: readonly ServiceTargetState[],
  connection: ServiceConnectionState | null
): boolean {
  return targets.some(target => isServiceTargetReady(target, connection))
}
