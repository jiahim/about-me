import { defineConfig } from 'vitepress'
import { search as zhSearch } from './zh'
// import { search as enSearch } from './en'

export const shared = defineConfig({
  title: "Jia him",
  description: "Jia him 的个人记录",

  // rewrites: {
  //   'zh/:rest*': ':rest*'
  // },
  cleanUrls: true,
  metaChunk: true,
  head: [
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
      message: '非商业用途，允许转载，需注明出处',
      copyright: `Copyright © 2024-${new Date().getFullYear()} Jia him`
    }
  },
  sitemap: {
    hostname: 'https://jiahim.com'
  }
})