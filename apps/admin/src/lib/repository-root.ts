import { existsSync } from 'node:fs'
import path from 'node:path'

export function findRepositoryRoot(): string {
  const configured = process.env.LOCAL_REPOSITORY_ROOT
  const candidates = [
    configured ? path.resolve(configured) : '',
    process.cwd(),
    path.resolve(process.cwd(), '../..')
  ].filter(Boolean)

  const repositoryRoot = candidates.find((candidate) =>
    existsSync(path.join(candidate, 'docs', '.vitepress'))
  )

  if (!repositoryRoot) {
    throw new Error('找不到本地仓库根目录，可通过 LOCAL_REPOSITORY_ROOT 显式设置')
  }

  return repositoryRoot
}
