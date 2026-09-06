import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  createDefaultSiteConfiguration,
  parseSiteConfiguration
} from './index.js'

function cloneDefault(): Record<string, any> {
  return structuredClone(createDefaultSiteConfiguration())
}

describe('站点配置契约', () => {
  it('保留固定顶层域并只持久化 crawler 的有效 allow 策略', () => {
    const config = parseSiteConfiguration(createDefaultSiteConfiguration())

    expect(Object.keys(config)).toEqual([
      'schemaVersion',
      'site',
      'branding',
      'author',
      'locales',
      'sections',
      'navigation',
      'homepage',
      'appearance',
      'seo',
      'geo',
      'footer',
      'integrations'
    ])
    expect(config.schemaVersion).toBe(2)
    expect(config.geo.crawlers.OAI_SearchBot).toEqual({ allow: true })
    expect(config.geo.crawlers.GPTBot).toEqual({ allow: false })
    expect(config.geo.llmsTxt.enabled).toBe(false)
  })

  it('递归拒绝未知字段和疑似秘密字段', () => {
    expect(() =>
      parseSiteConfiguration({ ...cloneDefault(), unexpected: true })
    ).toThrow()

    const nested = cloneDefault()
    nested.site.unexpected = true
    expect(() => parseSiteConfiguration(nested)).toThrow()

    const secret = cloneDefault()
    secret.integrations.analytics.token = 'secret'
    expect(() => parseSiteConfiguration(secret)).toThrow(/token/i)
  })

  it.each([
    ['/absolute/path', '绝对路径'],
    ['docs/zh/../private', '父级'],
    ['docs\\zh\\book', '反斜杠'],
    ['docs/zh/book\0secret', 'NUL']
  ])('拒绝非法栏目目录 %s', (directory) => {
    const input = cloneDefault()
    input.sections[0].directory = directory
    expect(() => parseSiteConfiguration(input)).toThrow()
  })

  it('拒绝越出 locale 内容根的栏目目录', () => {
    const input = cloneDefault()
    input.sections[0].directory = 'docs/en/book'
    expect(() => parseSiteConfiguration(input)).toThrow(/内容根/)
  })

  it('拒绝重复 ID、同语言重复路由、跨语言父级和栏目环', () => {
    const duplicateId = cloneDefault()
    duplicateId.sections[1].id = duplicateId.sections[0].id
    expect(() => parseSiteConfiguration(duplicateId)).toThrow(/ID/)

    const duplicateRoute = cloneDefault()
    duplicateRoute.sections[1].route = duplicateRoute.sections[0].route
    expect(() => parseSiteConfiguration(duplicateRoute)).toThrow(/路由/)

    const crossLocale = cloneDefault()
    crossLocale.locales.en = {
      label: 'English',
      contentRoot: 'docs/en',
      routePrefix: '/en/',
      vitepressKey: 'en',
      enabled: false
    }
    crossLocale.sections.push({
      ...crossLocale.sections[0],
      id: 'en-book',
      locale: 'en',
      directory: 'docs/en/book',
      route: '/en/book/',
      parentId: crossLocale.sections[0].id
    })
    expect(() => parseSiteConfiguration(crossLocale)).toThrow(/同一语言/)

    const cycle = cloneDefault()
    cycle.sections[0].parentId = cycle.sections[1].id
    cycle.sections[1].parentId = cycle.sections[0].id
    expect(() => parseSiteConfiguration(cycle)).toThrow(/循环/)
  })

  it('拒绝失效栏目引用和非法公开 URL', () => {
    const navigation = cloneDefault()
    navigation.navigation[0].sectionId = 'missing-section'
    expect(() => parseSiteConfiguration(navigation)).toThrow(/引用/)

    const homepage = cloneDefault()
    homepage.homepage.modules[1].items[0].sectionId = 'missing-section'
    expect(() => parseSiteConfiguration(homepage)).toThrow(/引用/)

    const url = cloneDefault()
    url.site.canonicalUrl = 'http://example.com'
    expect(() => parseSiteConfiguration(url)).toThrow(/HTTPS/)
  })

  it.each([
    ['//evil.example/x', 'network-path'],
    ['/images//avatar.png', '空路径段'],
    ['/images/./avatar.png', '点路径段']
  ])('拒绝非规范或可越域的公开路径 %s', (src) => {
    const input = cloneDefault()
    input.branding.logo.src = src
    expect(() => parseSiteConfiguration(input)).toThrow()
  })

  it.each([
    'https://cdn.example.com/logo.png',
    'https://cdn.example.com/assets/logo.png?version=2#dark',
    'http://localhost:3000/logo.png',
    'http://127.0.0.1:3000/logo.png',
    'http://[::1]:3000/logo.png'
  ])('保留安全的公开图片地址 %s', (src) => {
    const input = cloneDefault()
    input.branding.logo.src = src

    expect(parseSiteConfiguration(input).branding.logo.src).toBe(src)
  })

  it.each([
    'http://example.com/logo.png',
    'javascript:alert(1)',
    'https://user:password@example.com/logo.png',
    '//cdn.example.com/logo.png',
    '/images/../logo.png'
  ])('拒绝不安全的公开图片地址 %s', (src) => {
    const input = cloneDefault()
    input.branding.logo.src = src

    expect(() => parseSiteConfiguration(input)).toThrow()
  })

  it('拒绝 network-path 内部链接和带凭据的公开 URL', () => {
    const action = cloneDefault()
    action.homepage.modules[0].actions[0].href = '//evil.example/x'
    expect(() => parseSiteConfiguration(action)).toThrow()

    const credentials = cloneDefault()
    credentials.site.canonicalUrl = 'https://user:password@example.com'
    expect(() => parseSiteConfiguration(credentials)).toThrow(/凭据/)
  })

  it('允许页脚使用安全站内链接并拒绝越级路径', () => {
    const internal = cloneDefault()
    internal.footer.links.push({ label: '网站数据', href: '/my-site', newTab: false })
    expect(parseSiteConfiguration(internal).footer.links.at(-1)?.href).toBe('/my-site')

    internal.footer.links.at(-1).href = '/../private'
    expect(() => parseSiteConfiguration(internal)).toThrow(/站内路径/)
  })

  it.each([
    'https://example.com/blog',
    'https://example.com/?preview=1',
    'https://example.com/#section'
  ])('canonicalUrl 只接受 origin，不接受 %s', (canonicalUrl) => {
    const input = cloneDefault()
    input.site.canonicalUrl = canonicalUrl
    expect(() => parseSiteConfiguration(input)).toThrow(/origin/)
  })

  it.each(['docs//zh/book', 'docs/zh/book/', './docs/zh/book', 'C:/docs/zh/book'])(
    '拒绝非规范仓库路径 %s',
    (directory) => {
      const input = cloneDefault()
      input.sections[0].directory = directory
      expect(() => parseSiteConfiguration(input)).toThrow()
    }
  )

  it('v2 不接受公开层无法渲染的推荐文章模块', () => {
    const input = cloneDefault()
    input.homepage.modules.push({
      id: 'featured-posts',
      type: 'featuredArticles',
      visible: true,
      order: 2,
      title: '推荐文章',
      articleIds: ['article-2026-note']
    })
    expect(() => parseSiteConfiguration(input)).toThrow()
  })

  it('默认语言必须是唯一启用的 VitePress root locale', () => {
    const defaultNotRoot = cloneDefault()
    defaultNotRoot.locales['zh-CN'].vitepressKey = 'zh'
    expect(() => parseSiteConfiguration(defaultNotRoot)).toThrow(/默认语言.*root/)

    const twoRoots = cloneDefault()
    twoRoots.locales.en.enabled = true
    twoRoots.locales.en.vitepressKey = 'root'
    expect(() => parseSiteConfiguration(twoRoots)).toThrow(/唯一.*root/)
  })

  it('栏目导航引用唯一、顺序连续并与 header 状态一致', () => {
    const duplicate = cloneDefault()
    duplicate.navigation.push({
      ...duplicate.navigation[0],
      id: 'nav-book-2',
      order: duplicate.navigation.length
    })
    expect(() => parseSiteConfiguration(duplicate)).toThrow(/栏目.*导航.*唯一/)

    const orderGap = cloneDefault()
    orderGap.navigation[1].order = 8
    expect(() => parseSiteConfiguration(orderGap)).toThrow(/导航顺序.*连续/)

    const mismatch = cloneDefault()
    mismatch.sections[0].navigation.header = false
    expect(() => parseSiteConfiguration(mismatch)).toThrow(/顶部导航.*一致/)
  })

  it('拒绝导航、首页模块、首页卡片和 locale 映射冲突', () => {
    const navigation = cloneDefault()
    navigation.navigation[1].id = navigation.navigation[0].id
    expect(() => parseSiteConfiguration(navigation)).toThrow(/导航 ID/)

    const modules = cloneDefault()
    modules.homepage.modules[1].id = modules.homepage.modules[0].id
    expect(() => parseSiteConfiguration(modules)).toThrow(/首页模块 ID/)

    const features = cloneDefault()
    features.homepage.modules[1].items[1].id =
      features.homepage.modules[1].items[0].id
    expect(() => parseSiteConfiguration(features)).toThrow(/首页卡片 ID/)

    for (const field of ['contentRoot', 'routePrefix', 'vitepressKey']) {
      const locales = cloneDefault()
      locales.locales.en = {
        label: 'English',
        contentRoot: 'docs/en',
        routePrefix: '/en/',
        vitepressKey: 'en',
        enabled: false,
        [field]: locales.locales['zh-CN'][field]
      }
      expect(() => parseSiteConfiguration(locales)).toThrow(/语言.*唯一/)
    }
  })

  it('拒绝 locale 根祖先重叠和与栏目树不一致的物理层级', () => {
    const localeOverlap = cloneDefault()
    localeOverlap.locales.en = {
      label: 'English',
      contentRoot: 'docs/zh/en',
      routePrefix: '/zh/en/',
      vitepressKey: 'en',
      enabled: false
    }
    expect(() => parseSiteConfiguration(localeOverlap)).toThrow(/语言.*重叠/)

    const duplicateDirectory = cloneDefault()
    duplicateDirectory.sections[1].directory =
      duplicateDirectory.sections[0].directory
    expect(() => parseSiteConfiguration(duplicateDirectory)).toThrow(/栏目目录/)

    const invalidParent = cloneDefault()
    invalidParent.sections.push({
      ...invalidParent.sections[0],
      id: 'book-vue',
      name: 'Vue',
      directory: 'docs/zh/skill/vue',
      route: '/zh/skill/vue/',
      parentId: 'book'
    })
    expect(() => parseSiteConfiguration(invalidParent)).toThrow(/父栏目.*目录/)
  })

  it('拒绝倒置 outline 层级和启用但无 provider 的集成', () => {
    const outline = cloneDefault()
    outline.appearance.outline = { minLevel: 5, maxLevel: 2, label: '目录' }
    expect(() => parseSiteConfiguration(outline)).toThrow(/outline/)

    const analytics = cloneDefault()
    analytics.integrations.analytics.provider = 'none'
    expect(() => parseSiteConfiguration(analytics)).toThrow(/analytics/)

    const comments = cloneDefault()
    comments.integrations.comments.provider = 'none'
    expect(() => parseSiteConfiguration(comments)).toThrow(/comments/)
  })

  it('允许 HTTP loopback 预览 URL，但拒绝非法环境变量名', () => {
    const loopback = cloneDefault()
    loopback.site.canonicalUrl = 'http://127.0.0.1:5173'
    expect(() => parseSiteConfiguration(loopback)).not.toThrow()

    const integration = cloneDefault()
    integration.integrations.analytics.requiredEnvironmentVariables = [
      'analytics-secret'
    ]
    expect(() => parseSiteConfiguration(integration)).toThrow(/环境变量/)
  })

  it('真实配置复现当前中文站点的公开值与栏目顺序', () => {
    const configUrl = new URL('../../../config/site.config.json', import.meta.url)
    const config = parseSiteConfiguration(
      JSON.parse(readFileSync(configUrl, 'utf8'))
    )

    expect(config.site).toMatchObject({
      name: 'Jia him',
      description: 'Jia him 的个人记录',
      canonicalUrl: 'https://www.jiahim.com',
      defaultLocale: 'zh-CN'
    })
    expect(config.branding.logo.src).toBe('/images/me-gray.jpg')
    expect(config.integrations.analytics).toMatchObject({
      provider: 'umami',
      websiteId: '6af23795-63c9-4a92-8032-b0066d194e2a'
    })
    const publicSections = config.sections.filter((section) => section.status !== 'archived')

    expect(publicSections.map((section) => section.id)).toEqual([
      'book',
      'skill',
      'essay',
      'work'
    ])
    expect(publicSections.map((section) => section.route)).toEqual([
      '/zh/book/',
      '/zh/skill/',
      '/zh/essay/',
      '/zh/work/'
    ])
  })

  it('返回深冻结副本且不冻结或修改调用方输入', () => {
    const input = cloneDefault()
    const original = structuredClone(input)
    const parsed = parseSiteConfiguration(input)

    expect(input).toEqual(original)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.site)).toBe(true)
    expect(Object.isFrozen(parsed.sections)).toBe(true)
    expect(Object.isFrozen(parsed.sections[0])).toBe(true)
  })
})
