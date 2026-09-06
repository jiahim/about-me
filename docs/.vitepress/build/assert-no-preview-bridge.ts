import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const FORBIDDEN_MARKERS = ['settings-preview:update', 'site-preview=1', 'VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS'] as const

async function emittedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return emittedFiles(target)
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [target] : []
  }))
  return nested.flat()
}

export async function assertNoPreviewBridge(outputDirectory: string): Promise<string[]> {
  const matches: string[] = []
  for (const file of await emittedFiles(outputDirectory)) {
    const source = await readFile(file, 'utf8')
    for (const marker of FORBIDDEN_MARKERS) {
      if (source.includes(marker)) matches.push(`${path.relative(outputDirectory, file)}: ${marker}`)
    }
  }
  if (matches.length) throw new Error(`生产构建包含设置预览桥接标记：\n${matches.join('\n')}`)
  return matches
}
