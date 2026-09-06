import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  parseSiteConfiguration,
  type NormalizedSiteConfiguration
} from '@jiahim/site-schema'

import { findRepositoryRoot } from './repository-root'

export function loadSiteConfiguration(): NormalizedSiteConfiguration {
  const configPath = path.join(findRepositoryRoot(), 'config', 'site.config.json')

  try {
    return parseSiteConfiguration(JSON.parse(readFileSync(configPath, 'utf8')))
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`无法读取站点配置：${message}`)
  }
}
