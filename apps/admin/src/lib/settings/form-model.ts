import type { NormalizedSiteConfiguration, SiteConfiguration } from '@jiahim/site-schema'

type PathPart = string | number

export function updateSettingsAtPath<T>(
  source: T,
  path: readonly PathPart[],
  value: unknown
): T {
  if (!path.length) return value as T
  const [head, ...tail] = path
  if (Array.isArray(source)) {
    const copy = source.slice()
    copy[head as number] = updateSettingsAtPath(copy[head as number], tail, value)
    return copy as T
  }
  if (typeof source !== 'object' || source === null) {
    throw new Error('设置字段路径不存在')
  }
  const record = source as Record<string, unknown>
  return {
    ...record,
    [head]: updateSettingsAtPath(record[String(head)], tail, value)
  } as T
}

export function reorderByIds<T extends { id: string; order: number }>(
  items: readonly T[],
  orderedIds: readonly string[]
): T[] {
  if (
    orderedIds.length !== items.length ||
    new Set(orderedIds).size !== items.length ||
    items.some((item) => !orderedIds.includes(item.id))
  ) {
    throw new Error('重排必须包含全部且唯一的 ID')
  }
  const byId = new Map(items.map((item) => [item.id, item]))
  return orderedIds.map((id, order) => ({ ...byId.get(id)!, order }))
}

export function projectEnvironmentRequirements(
  config: SiteConfiguration | NormalizedSiteConfiguration,
  environment: Readonly<Record<string, string | undefined>>
): Array<{ name: string; exists: boolean }> {
  const names = new Set([
    ...config.integrations.analytics.requiredEnvironmentVariables,
    ...config.integrations.comments.requiredEnvironmentVariables
  ])
  return [...names]
    .sort()
    .map((name) => ({ name, exists: Boolean(environment[name]) }))
}
