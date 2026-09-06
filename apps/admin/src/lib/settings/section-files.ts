import { lstat, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'

export async function countSectionArticles(repositoryRoot: string, sectionDirectory: string): Promise<number> {
  const root = path.resolve(repositoryRoot)
  const directory = path.resolve(root, sectionDirectory)
  const relative = path.relative(root, directory)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('栏目目录越出仓库')
  const metadata = await lstat(directory)
  if (metadata.isSymbolicLink()) throw new Error('栏目目录不能是符号链接')
  const [realRoot, realDirectory] = await Promise.all([realpath(root), realpath(directory)])
  const realRelative = path.relative(realRoot, realDirectory)
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) throw new Error('栏目目录越出仓库')

  async function count(current: string): Promise<number> {
    const entries = await readdir(current, { withFileTypes: true })
    let total = 0
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) total += await count(path.join(current, entry.name))
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') total += 1
    }
    return total
  }
  return count(directory)
}
