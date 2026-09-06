import { defineConfig, type UserConfig } from 'vitepress'

import { search as zhSearch } from './zh'

export function createSharedConfig(adapterConfig: UserConfig): UserConfig {
  return defineConfig({
    ...adapterConfig,
    vite: {
      ...adapterConfig.vite,
      build: {
        ...adapterConfig.vite?.build,
        emptyOutDir: true
      }
    },
    srcExclude: [
      ...(adapterConfig.srcExclude ?? []),
      'superpowers/**',
      'uat/**',
      'api-examples.md',
      'markdown-examples.md'
    ],
    cleanUrls: true,
    metaChunk: true,
    themeConfig: {
      ...adapterConfig.themeConfig,
      search: {
        provider: 'local',
        options: { locales: zhSearch }
      }
    }
  })
}
