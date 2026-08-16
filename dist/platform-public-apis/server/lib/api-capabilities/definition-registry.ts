import { API_CAPABILITY_DEFINITIONS } from '#api-capabilities'
import type { ApiCapabilityDefinition } from '#shared/types/api-capability'

let definitionMapCache: Map<string, ApiCapabilityDefinition> | null = null

function createDefinitionKey(pathVersion: string, code: string): string {
  return `${pathVersion}:${code}`
}

export function hasApiCapabilityDefinition(pathVersion: string, code: string): boolean {
  return ensureDefinitionMap().has(createDefinitionKey(pathVersion, code))
}

export function getApiCapabilityDefinition(
  pathVersion: string,
  code: string
): ApiCapabilityDefinition | null {
  return ensureDefinitionMap().get(createDefinitionKey(pathVersion, code)) ?? null
}

function ensureDefinitionMap(): Map<string, ApiCapabilityDefinition> {
  if (definitionMapCache) return definitionMapCache

  const definitions = new Map<string, ApiCapabilityDefinition>()
  for (const entry of API_CAPABILITY_DEFINITIONS) {
    const key = createDefinitionKey(entry.pathVersion, entry.code)
    if (definitions.has(key)) {
      throw new Error(`[api-capabilities] Duplicate runtime definition: ${entry.pathVersion}/${entry.code}`)
    }
    definitions.set(key, entry.definition)
  }
  definitionMapCache = definitions
  return definitions
}
