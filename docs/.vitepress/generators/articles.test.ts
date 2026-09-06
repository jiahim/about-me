import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { afterEach, describe, expect, it } from 'vitest'

import { readPublicArticles } from './articles'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('readPublicArticles', () => {
  it('excludes indexes, drafts, and archived sections', async () => {
    const docsRoot = await mkdtemp(path.join(os.tmpdir(), 'public-articles-'))
    roots.push(docsRoot)
    await mkdir(path.join(docsRoot, 'zh/skill'), { recursive: true })
    await Promise.all([
      writeFile(path.join(docsRoot, 'zh/skill/index.md'), '# Index'),
      writeFile(path.join(docsRoot, 'zh/skill/live.md'), '---\ntitle: Live\ndate: 2026-01-01\ndescription: visible\n---\n# Live'),
      writeFile(path.join(docsRoot, 'zh/skill/draft.md'), '---\ntitle: Draft\ndraft: true\n---\n# Draft')
    ])
    const config = createDefaultSiteConfiguration()

    await expect(readPublicArticles(config, docsRoot)).resolves.toMatchObject([{ title: 'Live', route: '/zh/skill/live' }])
    config.sections.find((section) => section.id === 'skill')!.status = 'archived'
    await expect(readPublicArticles(config, docsRoot)).resolves.toEqual([])
  })
})
