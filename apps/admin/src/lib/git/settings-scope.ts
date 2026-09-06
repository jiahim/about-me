import path from 'node:path'

const settingsAssetPrefix = 'docs/public/images/site/'
const settingsConfigPath = 'config/site.config.json'

export function validateSettingsPublishPaths(
  requestedPaths: readonly string[],
  sessionPaths: ReadonlySet<string>
): string[] {
  const unique = [...new Set(requestedPaths)].sort()
  for (const candidate of unique) {
    const safeShape =
      candidate === settingsConfigPath ||
      (candidate.startsWith('docs/') && candidate.endsWith('/index.md')) ||
      candidate.startsWith(settingsAssetPrefix)
    if (
      !safeShape ||
      path.posix.isAbsolute(candidate) ||
      candidate.includes('..') ||
      candidate.includes('\\')
    ) {
      throw new Error('设置发布路径不在允许范围')
    }
    if (!sessionPaths.has(candidate)) {
      throw new Error('设置发布路径不属于当前服务端会话')
    }
  }
  return unique
}
