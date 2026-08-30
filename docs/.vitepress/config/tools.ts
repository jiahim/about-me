import type { DefaultTheme } from 'vitepress'

import fs from 'node:fs'
import path from 'node:path'

// 函数用于读取文件夹内容并生成侧边栏项
function generateSidebarItems(dir: string): DefaultTheme.SidebarItem[] {
  const items: DefaultTheme.SidebarItem[] = []
  const docsDir = path.resolve(__dirname, '../..')
  const files = fs.readdirSync(dir).sort((a, b) => b.localeCompare(a))

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // 递归处理子目录
      const subItems = generateSidebarItems(fullPath)
      
      // 如果子目录下有内容（md文件或包含md文件的子目录），则添加当前目录
      if (subItems.length > 0) {
        items.push({
          text: file,
          collapsed: true,
          items: subItems
        })
      }
    } else if (file.endsWith('.md') && file !== 'index.md') {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const slug = path.basename(file, '.md')
      const relativePath = '/' + path.relative(docsDir, dir).split(path.sep).join('/')

      items.push({
        text: getDocumentTitle(content, slug),
        link: `${relativePath}/${slug}`
      })
    }
  })

  return items
}

function getDocumentTitle(content: string, fallback: string): string {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const frontmatterTitle = frontmatter?.[1].match(/^title:\s*(.+)$/m)?.[1]

  if (frontmatterTitle) {
    return frontmatterTitle.trim().replace(/^(['"])(.*)\1$/, '$2')
  }

  return content.match(/^#\s+(.+)$/m)?.[1].trim() || fallback
}

export {
  generateSidebarItems
}
