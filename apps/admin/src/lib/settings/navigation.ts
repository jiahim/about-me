import type { SectionConfiguration, SiteConfiguration } from '@jiahim/site-schema'

type NavigationItem = SiteConfiguration['navigation'][number]

export interface AddSectionNavigationInput {
  locale: string
  sectionId: string
  label: string
}

export interface AddLinkNavigationInput {
  locale: string
  label: string
  href: string
  newTab?: boolean
}

export interface NavigationPatch {
  label?: string
  href?: string
  newTab?: boolean
  visible?: boolean
}

function clone(config: SiteConfiguration): SiteConfiguration {
  return structuredClone(config)
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'link'
}

function allocateId(config: SiteConfiguration, seed: string): string {
  const base = `nav-${slugify(seed)}`
  const ids = new Set(config.navigation.map((item) => item.id))
  if (!ids.has(base)) return base
  let suffix = 2
  while (ids.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function normalizeOrders(config: SiteConfiguration): void {
  const nextOrderByLocale = new Map<string, number>()
  config.navigation.forEach((item) => {
    const order = nextOrderByLocale.get(item.locale) ?? 0
    item.order = order
    nextOrderByLocale.set(item.locale, order + 1)
  })
}

function synchronizeHeaderFlags(config: SiteConfiguration): void {
  config.sections.forEach((section) => {
    if (section.parentId) return
    section.navigation.header = section.status === 'active' && config.navigation.some(
      (item) => item.type === 'section' && item.sectionId === section.id && item.visible
    )
  })
}

export function listAvailableHeaderSections(
  config: SiteConfiguration,
  locale: string
): SectionConfiguration[] {
  const used = new Set(config.navigation
    .filter((item) => item.type === 'section')
    .map((item) => item.sectionId))
  return config.sections.filter((section) =>
    section.locale === locale &&
    section.status === 'active' &&
    !section.parentId &&
    !used.has(section.id)
  )
}

export function addSectionNavigation(
  source: SiteConfiguration,
  input: AddSectionNavigationInput
): SiteConfiguration {
  const section = listAvailableHeaderSections(source, input.locale)
    .find((candidate) => candidate.id === input.sectionId)
  if (!section) throw new Error('只能添加尚未使用的启用顶级栏目')
  if (!input.label.trim()) throw new Error('导航标签不能为空')

  const config = clone(source)
  const order = config.navigation.filter((item) => item.locale === input.locale).length
  config.navigation.push({
    id: allocateId(config, section.id),
    type: 'section',
    locale: input.locale,
    label: input.label.trim(),
    sectionId: section.id,
    order,
    newTab: false,
    visible: true
  })
  synchronizeHeaderFlags(config)
  return config
}

export function addLinkNavigation(
  source: SiteConfiguration,
  input: AddLinkNavigationInput
): SiteConfiguration {
  if (!input.label.trim()) throw new Error('导航标签不能为空')
  if (!input.href.trim()) throw new Error('导航链接不能为空')

  const config = clone(source)
  const order = config.navigation.filter((item) => item.locale === input.locale).length
  config.navigation.push({
    id: allocateId(config, input.label),
    type: 'link',
    locale: input.locale,
    label: input.label.trim(),
    href: input.href.trim(),
    order,
    newTab: input.newTab ?? false,
    visible: true
  })
  return config
}

export function updateNavigation(
  source: SiteConfiguration,
  id: string,
  patch: NavigationPatch
): SiteConfiguration {
  const config = clone(source)
  const item = config.navigation.find((candidate) => candidate.id === id)
  if (!item) throw new Error('导航项不存在')

  if (patch.label !== undefined) item.label = patch.label
  if (patch.visible !== undefined) item.visible = patch.visible
  if (item.type === 'link') {
    if (patch.href !== undefined) item.href = patch.href
    if (patch.newTab !== undefined) item.newTab = patch.newTab
  }
  synchronizeHeaderFlags(config)
  return config
}

export function moveNavigation(
  source: SiteConfiguration,
  id: string,
  delta: -1 | 1
): SiteConfiguration {
  const config = clone(source)
  const item = config.navigation.find((candidate) => candidate.id === id)
  if (!item) throw new Error('导航项不存在')
  const localeIndexes = config.navigation
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.locale === item.locale)
    .map(({ index }) => index)
  const position = localeIndexes.findIndex((index) => config.navigation[index].id === id)
  const targetPosition = position + delta
  if (position < 0 || targetPosition < 0 || targetPosition >= localeIndexes.length) return config
  const currentIndex = localeIndexes[position]
  const targetIndex = localeIndexes[targetPosition]
  ;[config.navigation[currentIndex], config.navigation[targetIndex]] = [
    config.navigation[targetIndex],
    config.navigation[currentIndex]
  ]
  normalizeOrders(config)
  return config
}

export function removeNavigation(source: SiteConfiguration, id: string): SiteConfiguration {
  const config = clone(source)
  if (!config.navigation.some((item) => item.id === id)) throw new Error('导航项不存在')
  config.navigation = config.navigation.filter((item) => item.id !== id)
  normalizeOrders(config)
  synchronizeHeaderFlags(config)
  return config
}

export type { NavigationItem }
