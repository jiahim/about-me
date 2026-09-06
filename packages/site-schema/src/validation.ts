import type { SiteConfiguration } from './schema.js'

const secretFieldPattern = /token|secret|password|private.?key|webhook/i
const environmentVariablePattern = /^[A-Z][A-Z0-9_]*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertNoSecretFields(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretFields(item, `${path}[${index}]`))
    return
  }
  if (!isRecord(value)) return

  for (const [key, nested] of Object.entries(value)) {
    if (secretFieldPattern.test(key)) {
      throw new Error(`配置字段 ${path}.${key} 疑似包含秘密，不允许保存`)
    }
    assertNoSecretFields(nested, `${path}.${key}`)
  }
}

function assertPublicUrl(value: string, label: string): void {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} 不是有效 URL`)
  }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password) {
    throw new Error(`${label} 不允许包含凭据`)
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error(`${label} 必须使用 HTTPS；仅 loopback 预览允许 HTTP`)
  }
}

function assertCanonicalOrigin(value: string): void {
  assertPublicUrl(value, 'canonical URL')
  const url = new URL(value)

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('canonicalUrl 必须是无路径、查询或片段的 origin URL')
  }
}

function assertLink(value: string, label: string): void {
  if (value.startsWith('/')) {
    const segments = value.slice(1).split('/')
    if (
      value.startsWith('//') ||
      value.includes('\\') ||
      value.includes('\0') ||
      segments.some(
        (segment, index) =>
          (segment === '' && index !== segments.length - 1) ||
          segment === '.' ||
          segment === '..'
      )
    ) {
      throw new Error(`${label} 不是规范的站内路径`)
    }
    return
  }
  assertPublicUrl(value, label)
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} 必须唯一`)
  }
}

function pathsOverlap(left: string, right: string): boolean {
  return (
    left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
  )
}

function routePrefixesOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(right) || right.startsWith(left)
}

export function validateSiteConfiguration(config: SiteConfiguration): void {
  const defaultLocale = config.locales[config.site.defaultLocale]
  if (!defaultLocale || !defaultLocale.enabled) {
    throw new Error('默认语言必须存在且已启用')
  }
  if (defaultLocale.vitepressKey !== 'root') {
    throw new Error('默认语言必须映射到 VitePress root locale')
  }
  const enabledRootLocales = Object.values(config.locales).filter(
    (locale) => locale.enabled && locale.vitepressKey === 'root'
  )
  if (enabledRootLocales.length !== 1) {
    throw new Error('必须唯一启用一个 VitePress root locale')
  }

  assertCanonicalOrigin(config.site.canonicalUrl)
  assertUnique(config.sections.map((section) => section.id), '栏目 ID')
  assertUnique(config.navigation.map((item) => item.id), '导航 ID')
  assertUnique(config.homepage.modules.map((module) => module.id), '首页模块 ID')
  assertUnique(
    config.homepage.modules.flatMap((module) =>
      module.type === 'features' ? module.items.map((item) => item.id) : []
    ),
    '首页卡片 ID'
  )
  assertUnique(
    Object.values(config.locales).map((locale) => locale.contentRoot),
    '语言内容根'
  )
  assertUnique(
    Object.values(config.locales).map((locale) => locale.routePrefix),
    '语言路由前缀'
  )
  assertUnique(
    Object.values(config.locales).map((locale) => locale.vitepressKey),
    '语言 VitePress key'
  )
  const localeEntries = Object.entries(config.locales)
  for (let leftIndex = 0; leftIndex < localeEntries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < localeEntries.length; rightIndex += 1) {
      const [leftId, left] = localeEntries[leftIndex]
      const [rightId, right] = localeEntries[rightIndex]
      if (
        pathsOverlap(left.contentRoot, right.contentRoot) ||
        routePrefixesOverlap(left.routePrefix, right.routePrefix)
      ) {
        throw new Error(`语言 ${leftId} 与 ${rightId} 的内容根或路由前缀重叠`)
      }
    }
  }
  assertUnique(
    config.sections.map((section) => section.directory),
    '栏目目录'
  )

  const sectionsById = new Map(config.sections.map((section) => [section.id, section]))
  const routesByLocale = new Map<string, Set<string>>()

  for (const [localeId, locale] of Object.entries(config.locales)) {
    if (!locale.contentRoot.startsWith('docs/')) {
      throw new Error(`语言 ${localeId} 的内容根必须位于 docs/`)
    }
    if (!locale.routePrefix.startsWith('/') || !locale.routePrefix.endsWith('/')) {
      throw new Error(`语言 ${localeId} 的路由前缀无效`)
    }
  }

  for (const section of config.sections) {
    const locale = config.locales[section.locale]
    if (!locale) throw new Error(`栏目 ${section.id} 引用了不存在的语言`)
    if (!section.directory.startsWith(`${locale.contentRoot}/`)) {
      throw new Error(`栏目 ${section.id} 的目录不在对应语言内容根内`)
    }
    if (!section.route.startsWith(locale.routePrefix)) {
      throw new Error(`栏目 ${section.id} 的路由不在对应语言路由前缀内`)
    }

    const localeRoutes = routesByLocale.get(section.locale) ?? new Set<string>()
    if (localeRoutes.has(section.route)) {
      throw new Error(`同一语言的栏目路由必须唯一：${section.route}`)
    }
    localeRoutes.add(section.route)
    routesByLocale.set(section.locale, localeRoutes)

    if (section.parentId) {
      const parent = sectionsById.get(section.parentId)
      if (!parent) throw new Error(`栏目 ${section.id} 的父栏目引用不存在`)
      if (parent.locale !== section.locale) {
        throw new Error('父栏目与子栏目必须属于同一语言')
      }
    }
  }

  for (const section of config.sections) {
    const visited = new Set<string>()
    let current: typeof section | undefined = section
    while (current?.parentId) {
      if (visited.has(current.id)) throw new Error('栏目父子关系存在循环')
      visited.add(current.id)
      current = sectionsById.get(current.parentId)
    }
  }

  for (const section of config.sections) {
    if (section.parentId) {
      const parent = sectionsById.get(section.parentId)!
      if (
        !section.directory.startsWith(`${parent.directory}/`) ||
        !section.route.startsWith(parent.route)
      ) {
        throw new Error(`栏目 ${section.id} 的父栏目与目录或路由层级不一致`)
      }
    }

    const nearestDirectoryAncestor = config.sections
      .filter(
        (candidate) =>
          candidate.locale === section.locale &&
          section.directory.startsWith(`${candidate.directory}/`)
      )
      .sort((left, right) => right.directory.length - left.directory.length)[0]
    if (nearestDirectoryAncestor?.id !== section.parentId) {
      throw new Error(`栏目 ${section.id} 的父栏目不是最近的目录祖先`)
    }
  }

  for (const item of config.navigation) {
    if (!config.locales[item.locale]) {
      throw new Error(`导航 ${item.id} 的语言引用不存在`)
    }
    if (item.type === 'section') {
      const section = sectionsById.get(item.sectionId)
      if (!section) throw new Error(`导航 ${item.id} 的栏目引用不存在`)
      if (section.locale !== item.locale) {
        throw new Error(`导航 ${item.id} 与栏目必须属于同一语言`)
      }
    }
    if (item.type === 'link') assertLink(item.href, `导航 ${item.id}`)
  }

  const sectionNavigationIds = config.navigation
    .filter((item) => item.type === 'section')
    .map((item) => item.sectionId)
  assertUnique(sectionNavigationIds, '栏目导航引用')

  for (const localeId of Object.keys(config.locales)) {
    const orders = config.navigation
      .filter((item) => item.locale === localeId)
      .map((item) => item.order)
      .sort((left, right) => left - right)
    if (orders.some((order, index) => order !== index)) {
      throw new Error(`语言 ${localeId} 的导航顺序必须从 0 连续排列`)
    }
  }

  for (const section of config.sections) {
    if (section.parentId) continue
    const hasVisibleNavigation = config.navigation.some(
      (item) =>
        item.type === 'section' &&
        item.sectionId === section.id &&
        item.visible
    )
    const shouldShowInHeader = section.status === 'active' && hasVisibleNavigation
    if (section.navigation.header !== shouldShowInHeader) {
      throw new Error(`栏目 ${section.id} 的顶部导航状态必须与导航项一致`)
    }
  }

  for (const module of config.homepage.modules) {
    if (module.type === 'hero') {
      module.actions.forEach((action) => assertLink(action.href, '首页操作链接'))
    }
    if (module.type === 'features') {
      for (const item of module.items) {
        if (!!item.sectionId === !!item.href) {
          throw new Error(`首页模块 ${item.id} 必须且只能设置一个栏目或链接引用`)
        }
        if (item.sectionId && !sectionsById.has(item.sectionId)) {
          throw new Error(`首页模块 ${item.id} 的栏目引用不存在`)
        }
        if (item.href) assertLink(item.href, `首页模块 ${item.id}`)
      }
    }
  }

  if (config.appearance.outline.minLevel > config.appearance.outline.maxLevel) {
    throw new Error('appearance.outline 最小层级不能大于最大层级')
  }

  config.author.sameAs.forEach((href) => assertPublicUrl(href, '作者身份链接'))
  config.footer.links.forEach((link) => assertLink(link.href, '页脚链接'))
  config.footer.social.forEach((link) => assertPublicUrl(link.href, '社交链接'))
  if (config.integrations.analytics.enabled) {
    if (
      config.integrations.analytics.provider === 'none' ||
      !config.integrations.analytics.websiteId
    ) {
      throw new Error('启用 analytics 时必须配置公开 provider 和 website ID')
    }
    assertPublicUrl(config.integrations.analytics.scriptSrc, '分析脚本 URL')
  }
  if (
    config.integrations.comments.enabled &&
    (config.integrations.comments.provider === 'none' ||
      !config.integrations.comments.repository ||
      !config.integrations.comments.repositoryId ||
      !config.integrations.comments.category ||
      !config.integrations.comments.categoryId)
  ) {
    throw new Error('启用 comments 时必须配置完整公开标识')
  }

  const environmentVariables = [
    ...config.integrations.analytics.requiredEnvironmentVariables,
    ...config.integrations.comments.requiredEnvironmentVariables
  ]
  if (environmentVariables.some((name) => !environmentVariablePattern.test(name))) {
    throw new Error('集成所需环境变量名必须使用大写字母、数字和下划线')
  }
}
