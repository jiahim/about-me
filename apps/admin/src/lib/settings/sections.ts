import {
  parseSiteConfiguration,
  type SectionConfiguration,
  type SiteConfiguration
} from '@jiahim/site-schema'

export interface CreateSectionInput {
  name: string
  slug: string
  parentId?: string
  header: boolean
  sidebar: boolean
  collapsed: boolean
}

export interface PlannedSectionCreation {
  config: SiteConfiguration
  section: SectionConfiguration
  indexContents: string
}

function stableSlug(value: string): string {
  if (/[./\\]/.test(value)) {
    throw new Error('slug 不能包含路径字符')
  }
  const slug = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('slug 必须生成以字母开头的稳定小写 ID')
  }
  return slug
}

export function planSectionCreation(
  source: SiteConfiguration,
  input: CreateSectionInput
): PlannedSectionCreation {
  const config = structuredClone(source)
  const name = input.name.normalize('NFKC').trim()
  if (!name) throw new Error('栏目名称不能为空')
  const id = stableSlug(input.slug)
  if (config.sections.some((section) => section.id === id)) {
    throw new Error(`栏目 ID 重复：${id}`)
  }

  const localeId = config.site.defaultLocale
  const locale = config.locales[localeId]
  if (!locale?.enabled) throw new Error('默认语言不可用')
  const parent = input.parentId
    ? config.sections.find((section) => section.id === input.parentId)
    : undefined
  if (input.parentId && !parent) throw new Error('父栏目不存在')
  if (parent?.locale !== undefined && parent.locale !== localeId) {
    throw new Error('父栏目与新栏目必须属于同一语言')
  }
  if (parent?.status === 'archived') throw new Error('不能在已归档栏目下新增子栏目')

  const siblings = config.sections.filter(
    (section) => section.locale === localeId && section.parentId === parent?.id
  )
  const section: SectionConfiguration = {
    id,
    locale: localeId,
    name,
    description: '',
    directory: parent ? `${parent.directory}/${id}` : `${locale.contentRoot}/${id}`,
    route: parent ? `${parent.route}${id}/` : `${locale.routePrefix}${id}/`,
    ...(parent ? { parentId: parent.id } : {}),
    order: siblings.reduce((maximum, sibling) => Math.max(maximum, sibling.order), -1) + 1,
    navigation: {
      header: input.header,
      sidebar: input.sidebar,
      collapsed: input.collapsed
    },
    status: 'active'
  }
  if (
    config.sections.some(
      (candidate) =>
        candidate.directory === section.directory || candidate.route === section.route
    )
  ) {
    throw new Error('栏目目录或路由重复')
  }
  config.sections.push(section)
  if (input.header) {
    const navigationOrder = config.navigation
      .filter((item) => item.locale === localeId)
      .reduce((maximum, item) => Math.max(maximum, item.order), -1) + 1
    config.navigation.push({
      id: `nav-${id}`,
      type: 'section',
      locale: localeId,
      label: name,
      sectionId: id,
      order: navigationOrder,
      newTab: false,
      visible: true
    })
  }
  parseSiteConfiguration(config)
  return { config, section, indexContents: `# ${name}\n` }
}

export function planSectionArchive(
  source: SiteConfiguration,
  sectionId: string
): SiteConfiguration {
  const config = structuredClone(source)
  const section = config.sections.find((candidate) => candidate.id === sectionId)
  if (!section) throw new Error('栏目不存在')
  if (config.sections.some((candidate) => candidate.parentId === sectionId && candidate.status !== 'archived')) {
    throw new Error('请先归档该栏目的子栏目')
  }
  section.status = 'archived'
  section.navigation.header = false
  config.navigation
    .filter((item) => item.type === 'section' && item.sectionId === sectionId)
    .forEach((navigation) => { navigation.visible = false })
  parseSiteConfiguration(config)
  return config
}

export function assertGenericSectionUpdate(
  previous: SiteConfiguration,
  next: SiteConfiguration
): void {
  if (previous.sections.length !== next.sections.length) {
    throw new Error('栏目新增、删除或归档必须使用栏目管理向导')
  }
  const nextById = new Map(next.sections.map((section) => [section.id, section]))
  for (const before of previous.sections) {
    const after = nextById.get(before.id)
    if (!after) throw new Error('栏目新增、删除或归档必须使用栏目管理向导')
    for (const field of ['id', 'locale', 'directory', 'route', 'parentId', 'order', 'status'] as const) {
      if (before[field] !== after[field]) {
        throw new Error('栏目路径、层级、顺序和状态必须使用栏目管理向导')
      }
    }
  }
}
