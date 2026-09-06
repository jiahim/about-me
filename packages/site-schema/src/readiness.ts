import type { NormalizedSiteConfiguration } from './schema.js'

export type EnvironmentRequirementOwner = 'analytics' | 'comments'

export interface EnvironmentReadiness {
  name: string
  exists: boolean
  requiredBy: readonly EnvironmentRequirementOwner[]
}

export function evaluateEnvironmentReadiness(
  config: NormalizedSiteConfiguration,
  exists: (name: string) => boolean
): readonly EnvironmentReadiness[] {
  const owners = new Map<string, Set<EnvironmentRequirementOwner>>()
  const integrations: Array<[EnvironmentRequirementOwner, { readonly enabled: boolean; readonly requiredEnvironmentVariables: readonly string[] }]> = [
    ['analytics', config.integrations.analytics],
    ['comments', config.integrations.comments]
  ]
  for (const [owner, integration] of integrations) {
    if (!integration.enabled) continue
    for (const name of integration.requiredEnvironmentVariables) {
      const requiredBy = owners.get(name) ?? new Set<EnvironmentRequirementOwner>()
      requiredBy.add(owner)
      owners.set(name, requiredBy)
    }
  }
  return [...owners.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, requiredBy]) => ({
      name,
      exists: exists(name),
      requiredBy: [...requiredBy].sort()
    }))
}
