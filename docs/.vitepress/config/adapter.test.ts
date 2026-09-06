import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  buildSectionForest,
  createDefaultSiteConfiguration,
  parseSiteConfiguration
} from '@jiahim/site-schema'
import { afterEach, describe, expect, it } from 'vitest'

import { createVitePressAdapter } from './adapter'
import { loadSiteConfiguration } from './load-site-config'

const temporaryDirectories: string[] = []

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('VitePress 站点配置适配器', () => {
  it('保持当前导航、sidebar 路由并与编辑器栏目 ID 一致', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const config = loadSiteConfiguration(repositoryRoot)
    const adapter = createVitePressAdapter(
      config,
      path.join(repositoryRoot, 'docs')
    )

    expect(adapter.nav.root.map((item) => item.text)).toEqual([
      '读书',
      '技术',
      '随笔',
      '工作'
    ])
    expect(Object.keys(adapter.sidebar.root)).toEqual([
      '/zh/book/',
      '/zh/skill/',
      '/zh/essay/',
      '/zh/work/'
    ])
    expect(adapter.shared.srcExclude).toEqual(['en/**'])
    expect(adapter.locales.root.lang).toBe('zh-CN')
    const editorIds = buildSectionForest(config, {
      locale: 'zh-CN',
      surface: 'editor'
    }).map((node) => node.section.id)
    expect(adapter.sectionIds.root).toEqual(editorIds)
  })

  it('隐藏非公开栏目、继承嵌套折叠并保留外链新窗口', async () => {
    const docsRoot = await temporaryDirectory('site-adapter-docs-')
    for (const directory of ['book', 'book/vue', 'book/private', 'skill', 'essay', 'work']) {
      await mkdir(path.join(docsRoot, 'zh', directory), { recursive: true })
    }
    await writeFile(
      path.join(docsRoot, 'zh/book/private/secret.md'),
      '# 不应公开的文章'
    )
    const input = createDefaultSiteConfiguration()
    input.sections.push(
      {
        ...input.sections[0],
        id: 'book-vue',
        name: 'Vue',
        description: 'Vue',
        directory: 'docs/zh/book/vue',
        route: '/zh/book/vue/',
        parentId: 'book',
        navigation: { header: false, sidebar: true, collapsed: true }
      },
      {
        ...input.sections[0],
        id: 'private',
        name: '私密',
        directory: 'docs/zh/book/private',
        route: '/zh/book/private/',
        parentId: 'book',
        status: 'hidden'
      }
    )
    input.navigation.push({
      id: 'nav-source',
      type: 'link',
      locale: 'zh-CN',
      label: '源码',
      href: 'https://github.com/xiexin12138/about-me',
      order: 4,
      newTab: true,
      visible: true
    })
    const features = input.homepage.modules.find(
      (module) => module.type === 'features'
    )
    if (features?.type === 'features') {
      features.items.push({
        id: 'feature-private',
        icon: '🔒',
        title: '私密',
        details: '不应公开',
        sectionId: 'private'
      })
    }

    const adapter = createVitePressAdapter(
      parseSiteConfiguration(input),
      docsRoot
    )
    expect(adapter.nav.root.map((item) => item.text)).not.toContain('私密')
    expect(adapter.nav.root.at(-1)).toMatchObject({ text: '源码', target: '_blank' })
    expect(JSON.stringify(adapter.sidebar.root)).toContain('Vue')
    expect(JSON.stringify(adapter.sidebar.root)).toContain('"collapsed":true')
    expect(JSON.stringify(adapter.sidebar.root)).not.toContain('不应公开的文章')
    expect(adapter.shared.srcExclude).toContain('zh/book/private/**')
    const editorIds = buildSectionForest(parseSiteConfiguration(input), {
      locale: 'zh-CN',
      surface: 'editor'
    }).flatMap(function collect(node): string[] {
      return [node.section.id, ...node.children.flatMap(collect)]
    })
    expect(adapter.sectionIds.root).toEqual(editorIds)
    const pageData = { relativePath: 'index.md', frontmatter: {} }
    adapter.shared.transformPageData?.(pageData as never)
    expect(JSON.stringify(pageData.frontmatter)).not.toContain('不应公开')
  })

  it('injects canonical, indexing, Open Graph, and JSON-LD metadata for articles', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const config = loadSiteConfiguration(repositoryRoot)
    const adapter = createVitePressAdapter(config, path.join(repositoryRoot, 'docs'))
    const pageData = {
      relativePath: 'zh/skill/example.md',
      title: '示例文章',
      description: '文章摘要',
      frontmatter: { date: '2026-01-01' }
    }

    adapter.shared.transformPageData?.(pageData as never)

    expect(pageData.frontmatter).toMatchObject({
      head: expect.arrayContaining([
        ['link', expect.objectContaining({ rel: 'canonical', href: `${config.site.canonicalUrl}/zh/skill/example` })],
        ['meta', expect.objectContaining({ property: 'og:title', content: '示例文章' })],
        ['meta', expect.objectContaining({ property: 'og:image', content: `${config.site.canonicalUrl}${config.branding.shareImage.src}` })],
        ['meta', expect.objectContaining({ property: 'og:image:alt', content: config.branding.shareImage.alt })],
        ['script', expect.objectContaining({ type: 'application/ld+json' }), expect.stringContaining('BlogPosting')]
      ])
    })
  })

  it('keeps directory canonicals aligned and excludes drafts from the public build', async () => {
    const docsRoot = await temporaryDirectory('site-adapter-draft-')
    for (const directory of ['book', 'skill', 'essay', 'work']) await mkdir(path.join(docsRoot, 'zh', directory), { recursive: true })
    await writeFile(path.join(docsRoot, 'zh/skill/draft.md'), '---\ndraft: true\ndate: 2026-01-01\n---\n# Draft')
    const config = parseSiteConfiguration(createDefaultSiteConfiguration())
    const adapter = createVitePressAdapter(config, docsRoot)
    expect(adapter.shared.srcExclude).toContain('zh/skill/draft.md')

    const sectionPage = { relativePath: 'zh/skill/index.md', title: '技术', description: '', frontmatter: {} }
    adapter.shared.transformPageData?.(sectionPage as never)
    expect(sectionPage.frontmatter.head).toContainEqual(['link', expect.objectContaining({ rel: 'canonical', href: 'https://jiahim.com/zh/skill/' })])
    expect(JSON.stringify(sectionPage.frontmatter.head)).not.toContain('BlogPosting')

    const draftPage = { relativePath: 'zh/skill/draft.md', title: 'Draft', description: '', frontmatter: { draft: true, date: '2026-01-01' } }
    adapter.shared.transformPageData?.(draftPage as never)
    expect(draftPage.frontmatter.head).toContainEqual(['meta', { name: 'robots', content: 'noindex,nofollow' }])
    expect(JSON.stringify(draftPage.frontmatter.head)).not.toContain('BlogPosting')
  })

  it('拒绝栏目目录内的符号链接', async () => {
    const docsRoot = await temporaryDirectory('site-adapter-symlink-docs-')
    const outsideRoot = await temporaryDirectory('site-adapter-symlink-outside-')
    for (const directory of ['book', 'skill', 'essay', 'work']) {
      await mkdir(path.join(docsRoot, 'zh', directory), { recursive: true })
    }
    await writeFile(path.join(outsideRoot, 'outside.md'), '# 仓库外文章')
    await symlink(outsideRoot, path.join(docsRoot, 'zh/book/external'))

    expect(() =>
      createVitePressAdapter(createDefaultSiteConfiguration(), docsRoot)
    ).toThrow(/符号链接/)
  })

  it('从站点配置注入首页 hero 与栏目卡片', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const config = loadSiteConfiguration(repositoryRoot)
    const adapter = createVitePressAdapter(
      config,
      path.join(repositoryRoot, 'docs')
    )
    const pageData = {
      relativePath: 'index.md',
      frontmatter: {}
    }

    expect(adapter.shared.transformPageData).toBeTypeOf('function')
    adapter.shared.transformPageData?.(pageData as never)

    expect(pageData.frontmatter).toMatchObject({
      layout: 'home',
      hero: {
        name: 'Jia him',
        actions: [{ theme: 'brand', text: '浏览技术文章', link: '/zh/skill/' }]
      },
      features: expect.arrayContaining([
        expect.objectContaining({ title: '读书笔记', link: '/zh/book/' })
      ])
    })
    expect(adapter.shared.themeConfig).toMatchObject({
      comments: {
        enabled: true,
        provider: 'giscus',
        repository: 'xiexin12138/about-me'
      }
    })
  })

  it('输出所有启用语言，并只排除未启用语言目录', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const input = createDefaultSiteConfiguration()
    input.locales.en = {
      label: 'English',
      contentRoot: 'docs/en',
      routePrefix: '/en/',
      vitepressKey: 'en',
      enabled: true
    }
    const adapter = createVitePressAdapter(
      parseSiteConfiguration(input),
      path.join(repositoryRoot, 'docs')
    )

    expect(Object.keys(adapter.locales)).toEqual(['root', 'en'])
    expect(adapter.shared.srcExclude).not.toContain('en/**')

    input.locales.en.enabled = false
    const disabledAdapter = createVitePressAdapter(
      parseSiteConfiguration(input),
      path.join(repositoryRoot, 'docs')
    )
    expect(disabledAdapter.shared.srcExclude).toContain('en/**')
  })

  it('uses explicit social providers when adapting footer links', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const input = createDefaultSiteConfiguration()
    input.footer.social = [
      { provider: 'github', label: 'Source', href: 'https://github.com/example' },
      { provider: 'x', label: 'Updates', href: 'https://x.com/example' },
      { provider: 'generic', label: 'Elsewhere', href: 'https://example.com/profile' }
    ]

    const adapter = createVitePressAdapter(
      parseSiteConfiguration(input),
      path.join(repositoryRoot, 'docs')
    )

    expect(adapter.shared.themeConfig).toMatchObject({
      socialLinks: [
        { icon: 'github', link: 'https://github.com/example' },
        { icon: 'x', link: 'https://x.com/example' },
        { icon: expect.objectContaining({ svg: expect.stringContaining('<svg') }), link: 'https://example.com/profile' }
      ]
    })
    const genericIcon = (adapter.shared.themeConfig as { socialLinks: Array<{ icon: unknown }> }).socialLinks[2].icon
    expect(JSON.stringify(genericIcon)).not.toContain('Elsewhere')
    expect(JSON.stringify(genericIcon)).not.toContain('example.com')
  })

  it('maps every visual v2 setting and omits analytics while serving', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..')
    const config = parseSiteConfiguration(createDefaultSiteConfiguration())
    const buildAdapter = createVitePressAdapter(config, path.join(repositoryRoot, 'docs'), { command: 'build' })
    const serveAdapter = createVitePressAdapter(config, path.join(repositoryRoot, 'docs'), { command: 'serve' })

    expect(buildAdapter.shared).toMatchObject({
      titleTemplate: ':title | Jia him',
      markdown: { theme: { light: 'github-light', dark: 'github-dark' } },
      themeConfig: {
        logo: { src: '/images/me-gray.jpg', alt: 'Jia him' },
        siteAppearance: {
          defaultTheme: 'auto',
          accentColor: '#3eaf7c',
          contentLayout: 'doc'
        }
      }
    })
    expect(JSON.stringify(buildAdapter.shared.head)).toContain(config.integrations.analytics.scriptSrc)
    expect(JSON.stringify(serveAdapter.shared.head)).not.toContain(config.integrations.analytics.scriptSrc)
  })

  it('非法配置错误包含文件路径和字段路径', async () => {
    const repositoryRoot = await temporaryDirectory('site-adapter-invalid-')
    await mkdir(path.join(repositoryRoot, 'config'), { recursive: true })
    const configPath = path.join(repositoryRoot, 'config/site.config.json')
    await writeFile(
      configPath,
      JSON.stringify({ ...createDefaultSiteConfiguration(), site: { name: '' } })
    )

    expect(() => loadSiteConfiguration(repositoryRoot)).toThrow(configPath)
    expect(() => loadSiteConfiguration(repositoryRoot)).toThrow(/site.*name/s)
  })
})
