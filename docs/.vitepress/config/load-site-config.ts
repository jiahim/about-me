import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  parseSiteConfiguration,
  type NormalizedSiteConfiguration
} from '@jiahim/site-schema'

const defaultRepositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))

export function loadSiteConfiguration(
  repositoryRoot = defaultRepositoryRoot
): NormalizedSiteConfiguration {
  const configPath = path.join(repositoryRoot, 'config', 'site.config.json')

  try {
    if (lstatSync(configPath).isSymbolicLink()) {
      throw new Error('配置文件不能是符号链接')
    }
    const realRoot = realpathSync(repositoryRoot)
    const realConfig = realpathSync(configPath)
    if (!realConfig.startsWith(`${realRoot}${path.sep}`)) {
      throw new Error('配置文件越出了当前仓库')
    }
    return parseSiteConfiguration(JSON.parse(readFileSync(realConfig, 'utf8')))
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`站点配置 ${configPath} 无效：${message}`)
  }
}
