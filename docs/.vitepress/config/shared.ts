import { defineConfig } from 'vitepress'
import { search as zhSearch } from './zh'
// import { search as enSearch } from './en'

export const shared = defineConfig({
  title: "Jia him",
  description: "Jia him 的个人记录",

  // 英文内容仍在整理中，示例页面也不属于正式站点。
  srcExclude: ['en/**', 'api-examples.md', 'markdown-examples.md'],

  // rewrites: {
  //   'zh/:rest*': ':rest*'
  // },
  cleanUrls: true,
  metaChunk: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    [
      'script',
      {
        defer: '',
        src: 'https://analytics.xiexin.dev/script.js',
        'data-website-id': '6af23795-63c9-4a92-8032-b0066d194e2a'
      }]
  ],
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/xiexin12138' }
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          ...zhSearch,
          // ...enSearch,
        }
      }
    },
    logo: '/images/me-gray.jpg',

    outline: {
      level: [2, 4], // 显示 2-4 层级的 title 作为右侧目录
      label: "目录"
    },

    footer: {
      message: `
        <span class="footer-links">
          <span class="footer-links__label">友情链接</span>
          <a class="footer-links__link" href="https://www.any-site.com" target="_blank" rel="noopener noreferrer">网站任意门</a>
          <span class="footer-links__divider" aria-hidden="true">·</span>
          <a class="footer-links__link" href="https://www.openai-api-chinese.com/" target="_blank" rel="noopener noreferrer">近期在做：自动同步翻译 OpenAI API 中文文档</a>
          <span class="footer-links__divider" aria-hidden="true">·</span>
          <a class="footer-links__link" href="/my-site">网站数据</a>
        </span>
        <span class="footer-note">非商业用途，允许转载，需注明出处</span>
      `,
      copyright: `Copyright © 2024-${new Date().getFullYear()} Jia him`
    }
  },
  sitemap: {
    hostname: 'https://jiahim.com'
  }
})
