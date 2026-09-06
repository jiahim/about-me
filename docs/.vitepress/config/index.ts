
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type DefaultTheme, type UserConfigFn } from 'vitepress'
import { evaluateEnvironmentReadiness } from '@jiahim/site-schema'

import { createVitePressAdapter } from './adapter'
import { loadSiteConfiguration } from './load-site-config'
import { createSharedConfig } from './shared'
import { zhThemeConfig } from './zh'
import { readPublicArticles } from '../generators/articles'
import { generatePublicFiles } from '../build/generate-public-files'
import { assertNoPreviewBridge } from '../build/assert-no-preview-bridge'
import { createSiteConfigWatcher } from './site-config-watcher'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const siteConfiguration = loadSiteConfiguration(repositoryRoot)
export default (({ command }) => {
  if (command === 'build') {
    const missing = evaluateEnvironmentReadiness(siteConfiguration, (name) => Boolean(process.env[name]))
      .filter((requirement) => !requirement.exists)
    if (missing.length) {
      throw new Error(`缺少公开集成所需环境变量：${missing.map((item) => item.name).join(', ')}`)
    }
  }
  const adapter = createVitePressAdapter(
    siteConfiguration,
    path.join(repositoryRoot, 'docs'),
    { command }
  )
  const shared = createSharedConfig(adapter.shared)
  const rootLocale = adapter.locales.root

  if (!rootLocale) {
    throw new Error('站点配置必须包含启用且 vitepressKey 为 root 的默认语言')
  }

  return defineConfig({
    ...shared,
    async buildEnd(siteConfig) {
      await shared.buildEnd?.(siteConfig)
      const articles = await readPublicArticles(siteConfiguration, path.join(repositoryRoot, 'docs'))
      await generatePublicFiles(siteConfiguration, articles, siteConfig.outDir)
      await assertNoPreviewBridge(siteConfig.outDir)
    },
    vite: {
      ...shared.vite,
      plugins: [
        ...(shared.vite?.plugins ?? []),
        createSiteConfigWatcher(path.join(repositoryRoot, 'config/site.config.json'))
      ]
    },
    locales: Object.fromEntries(
      Object.entries(adapter.locales).map(([key, locale]) => [
        key,
        key === 'root'
          ? {
              ...locale,
              themeConfig: { ...locale.themeConfig, ...zhThemeConfig }
            }
          : locale
      ])
    )
  })
}) satisfies UserConfigFn<DefaultTheme.Config>
