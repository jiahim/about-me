import type { SiteConfiguration } from './schema.js'

export const CURRENT_SCHEMA_VERSION = 2 as const

const defaults: SiteConfiguration = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  site: {
    name: 'Jia him',
    description: 'Jia him 的个人记录',
    canonicalUrl: 'https://jiahim.com',
    defaultLocale: 'zh-CN'
  },
  branding: {
    logo: { src: '/images/me-gray.jpg', alt: 'Jia him' },
    favicon: {
      src: '/favicon-32x32.png',
      type: 'image/png',
      sizes: '32x32'
    },
    appleTouchIcon: {
      src: '/apple-touch-icon.png',
      sizes: '180x180'
    },
    shareImage: { src: '/images/me.jpg', alt: 'Jia him' }
  },
  author: {
    id: 'jia-him',
    name: 'Jia him',
    bio: '记录技术、阅读、工作复盘与日常思考。',
    avatar: { src: '/images/me.jpg' },
    sameAs: ['https://github.com/xiexin12138']
  },
  locales: {
    'zh-CN': {
      label: '简体中文',
      contentRoot: 'docs/zh',
      routePrefix: '/zh/',
      vitepressKey: 'root',
      enabled: true
    },
    en: {
      label: 'English',
      contentRoot: 'docs/en',
      routePrefix: '/en/',
      vitepressKey: 'en',
      enabled: false
    }
  },
  sections: [
    {
      id: 'book',
      locale: 'zh-CN',
      name: '读书',
      description: '读书笔记',
      directory: 'docs/zh/book',
      route: '/zh/book/',
      order: 0,
      navigation: { header: true, sidebar: true, collapsed: false },
      status: 'active'
    },
    {
      id: 'skill',
      locale: 'zh-CN',
      name: '技术',
      description: '技术文章',
      directory: 'docs/zh/skill',
      route: '/zh/skill/',
      order: 1,
      navigation: { header: true, sidebar: true, collapsed: false },
      status: 'active'
    },
    {
      id: 'essay',
      locale: 'zh-CN',
      name: '随笔',
      description: '随笔',
      directory: 'docs/zh/essay',
      route: '/zh/essay/',
      order: 2,
      navigation: { header: true, sidebar: true, collapsed: false },
      status: 'active'
    },
    {
      id: 'work',
      locale: 'zh-CN',
      name: '工作',
      description: '经验之谈',
      directory: 'docs/zh/work',
      route: '/zh/work/',
      order: 3,
      navigation: { header: true, sidebar: true, collapsed: false },
      status: 'active'
    }
  ],
  navigation: [
    { id: 'nav-book', type: 'section', locale: 'zh-CN', label: '读书', sectionId: 'book', order: 0, newTab: false, visible: true },
    { id: 'nav-skill', type: 'section', locale: 'zh-CN', label: '技术', sectionId: 'skill', order: 1, newTab: false, visible: true },
    { id: 'nav-essay', type: 'section', locale: 'zh-CN', label: '随笔', sectionId: 'essay', order: 2, newTab: false, visible: true },
    { id: 'nav-work', type: 'section', locale: 'zh-CN', label: '工作', sectionId: 'work', order: 3, newTab: false, visible: true }
  ],
  homepage: {
    modules: [
      {
        id: 'home-hero',
        type: 'hero',
        visible: true,
        order: 0,
        name: 'Jia him',
        text: '的个人博客',
        tagline: '技术、阅读、工作复盘，也记录一些日常思考',
        image: { src: '/images/me.jpg', alt: 'Jia him' },
        actions: [
          { label: '浏览技术文章', href: '/zh/skill/', newTab: false }
        ]
      },
      {
        id: 'home-features',
        type: 'features',
        visible: true,
        order: 1,
        items: [
          { id: 'feature-book', icon: '📚', title: '读书笔记', details: '读一本，写一篇，画一图', sectionId: 'book' },
          { id: 'feature-skill', icon: '💻', title: '技术文章', details: '费曼学习法 + 温故而知新', sectionId: 'skill' },
          { id: 'feature-essay', icon: '✍️', title: '随笔', details: '往前看是迷茫，往后看是命运', sectionId: 'essay' },
          { id: 'feature-work', icon: '🧭', title: '经验之谈', details: '记录工作中的真实问题与复盘', sectionId: 'work' }
        ]
      }
    ]
  },
  appearance: {
    defaultTheme: 'auto',
    accentColor: '#3eaf7c',
    contentLayout: 'doc',
    codeTheme: { light: 'github-light', dark: 'github-dark' },
    outline: { minLevel: 2, maxLevel: 4, label: '目录' }
  },
  seo: {
    titleTemplate: ':title | Jia him',
    defaultDescription: 'Jia him 的个人记录',
    canonical: { enabled: true },
    indexing: { index: true, follow: true },
    openGraph: {
      enabled: true,
      siteName: 'Jia him'
    },
    sitemap: { enabled: true },
    feed: {
      enabled: true,
      title: 'Jia him',
      description: 'Jia him 的个人记录'
    },
    structuredData: {
      website: true,
      person: true,
      blogPosting: true,
      breadcrumbs: true
    }
  },
  geo: {
    crawlers: {
      Googlebot: { allow: true },
      Google_Extended: { allow: false },
      OAI_SearchBot: { allow: true },
      GPTBot: { allow: false }
    },
    llmsTxt: { enabled: false },
    contentSignals: {
      requireAuthor: true,
      requirePublishedAt: true,
      requireUpdatedAt: true,
      requireCanonical: true,
      requireImageAlt: true,
      requireCitations: true
    }
  },
  footer: {
    copyright: { startYear: 2024, holder: 'Jia him' },
    notice: '非商业用途，允许转载，需注明出处',
    links: [
      { label: '网站任意门', href: 'https://www.any-site.com', newTab: true },
      { label: '近期在做：自动同步翻译 OpenAI API 中文文档', href: 'https://www.openai-api-chinese.com/', newTab: true }
    ],
    social: [
      {
        provider: 'github',
        label: 'GitHub',
        href: 'https://github.com/xiexin12138'
      }
    ]
  },
  integrations: {
    analytics: {
      enabled: true,
      provider: 'umami',
      scriptSrc: 'https://analytics.xiexin.dev/script.js',
      websiteId: '6af23795-63c9-4a92-8032-b0066d194e2a',
      requiredEnvironmentVariables: []
    },
    comments: {
      enabled: true,
      provider: 'giscus',
      repository: 'xiexin12138/about-me',
      repositoryId: 'R_kgDOLyaSCg',
      category: 'General',
      categoryId: 'DIC_kwDOLyaSCs4CmvhT',
      mapping: 'pathname',
      requiredEnvironmentVariables: []
    }
  }
}

export function createDefaultSiteConfiguration(): SiteConfiguration {
  return structuredClone(defaults)
}
