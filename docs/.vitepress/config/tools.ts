import fs from 'node:fs'
import path from 'node:path'

import type { DefaultTheme } from 'vitepress'

function routeJoin(prefix: string, segment: string): string {
  return `${prefix.replace(/\/$/, '')}/${segment}`
}

export function generateSidebarItems(
  directory: string,
  routePrefix: string,
  excludedDirectories: ReadonlySet<string> = new Set(),
  allowedRoot: string = directory
): DefaultTheme.SidebarItem[] {
  assertSafePath(directory, allowedRoot)
  const items: DefaultTheme.SidebarItem[] = []
  const files = fs.readdirSync(directory).sort((left, right) =>
    right.localeCompare(left)
  )

  for (const file of files) {
    const fullPath = path.join(directory, file)
    if (excludedDirectories.has(fullPath)) continue
    const metadata = assertSafePath(fullPath, allowedRoot)

    if (metadata.isDirectory()) {
      const subItems = generateSidebarItems(
        fullPath,
        `${routeJoin(routePrefix, file)}/`,
        excludedDirectories,
        allowedRoot
      )
      if (subItems.length) {
        items.push({ text: file, collapsed: true, items: subItems })
      }
      continue
    }

    if (metadata.isFile() && file.endsWith('.md') && file !== 'index.md') {
      const content = fs.readFileSync(fullPath, 'utf8')
      const slug = path.basename(file, '.md')
      items.push({
        text: getDocumentTitle(content, slug),
        link: routeJoin(routePrefix, slug)
      })
    }
  }

  return items
}

function assertSafePath(target: string, allowedRoot: string): fs.Stats {
  const metadata = fs.lstatSync(target)
  if (metadata.isSymbolicLink()) {
    throw new Error(`sidebar 不允许读取符号链接：${target}`)
  }
  const relative = path.relative(fs.realpathSync(allowedRoot), fs.realpathSync(target))
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`sidebar 路径越出文档目录：${target}`)
  }
  return metadata
}

function getDocumentTitle(content: string, fallback: string): string {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const frontmatterTitle = frontmatter?.[1].match(/^title:\s*(.+)$/m)?.[1]
  if (frontmatterTitle) {
    return frontmatterTitle.trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return content.match(/^#\s+(.+)$/m)?.[1].trim() || fallback
}
