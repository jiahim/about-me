import type {
  DeepReadonly,
  SectionConfiguration
} from './schema.js'

export type SectionSurface = 'editor' | 'header' | 'sidebar'

export interface SectionNode {
  readonly section: DeepReadonly<SectionConfiguration>
  readonly children: readonly SectionNode[]
}

type ConfigurationWithSections = {
  readonly sections: readonly DeepReadonly<SectionConfiguration>[]
  readonly locales: Readonly<
    Record<string, { readonly enabled: boolean } | undefined>
  >
}

function compareSections(
  left: DeepReadonly<SectionConfiguration>,
  right: DeepReadonly<SectionConfiguration>
): number {
  return (
    left.order - right.order ||
    left.name.localeCompare(right.name, 'zh-CN') ||
    left.id.localeCompare(right.id)
  )
}

function visibleOnSurface(
  section: DeepReadonly<SectionConfiguration>,
  surface: SectionSurface
): boolean {
  if (section.status === 'archived') return false
  if (surface === 'editor') return true
  return section.status === 'active' && section.navigation[surface]
}

export function buildSectionForest(
  config: ConfigurationWithSections,
  options: { locale: string; surface: SectionSurface }
): readonly SectionNode[] {
  if (!config.locales[options.locale]?.enabled) return []

  const candidates = config.sections
    .filter(
      (section) =>
        section.locale === options.locale && visibleOnSurface(section, options.surface)
    )
    .slice()
    .sort(compareSections)
  const candidatesById = new Map(candidates.map((section) => [section.id, section]))
  const childrenByParent = new Map<string | undefined, typeof candidates>()

  for (const section of candidates) {
    if (section.parentId && !candidatesById.has(section.parentId)) continue
    const siblings = childrenByParent.get(section.parentId) ?? []
    siblings.push(section)
    childrenByParent.set(section.parentId, siblings)
  }

  const buildChildren = (parentId?: string): readonly SectionNode[] =>
    (childrenByParent.get(parentId) ?? []).map((section) => ({
      section,
      children: buildChildren(section.id)
    }))

  return buildChildren()
}

function flatten(
  nodes: readonly SectionNode[]
): DeepReadonly<SectionConfiguration>[] {
  return nodes.flatMap((node) => [
    node.section,
    ...flatten(node.children)
  ])
}

export function listCreatableSections(
  config: ConfigurationWithSections,
  locale: string
): readonly DeepReadonly<SectionConfiguration>[] {
  return flatten(buildSectionForest(config, { locale, surface: 'editor' }))
}

function isArticleRepositoryPath(articlePath: string): boolean {
  if (
    !articlePath.endsWith('.md') ||
    articlePath.endsWith('/index.md') ||
    articlePath.startsWith('/') ||
    articlePath.includes('\\') ||
    articlePath.includes('\0')
  ) {
    return false
  }

  return articlePath
    .split('/')
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

export function findSectionForArticlePath(
  config: ConfigurationWithSections,
  articlePath: string
): DeepReadonly<SectionConfiguration> | undefined {
  if (!isArticleRepositoryPath(articlePath)) return undefined

  return config.sections
    .filter((section) => articlePath.startsWith(`${section.directory}/`))
    .slice()
    .sort(
      (left, right) =>
        right.directory.length - left.directory.length || compareSections(left, right)
    )[0]
}
