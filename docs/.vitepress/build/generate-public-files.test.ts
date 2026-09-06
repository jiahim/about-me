import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { afterEach, describe, expect, it } from 'vitest'

import { generatePublicFiles } from './generate-public-files'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('generatePublicFiles', () => {
  it('writes controlled discovery files and omits llms.txt by default', async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'public-output-'))
    roots.push(outDir)
    const config = createDefaultSiteConfiguration()
    await generatePublicFiles(config, [], outDir)

    expect(await readdir(outDir)).toEqual(expect.arrayContaining(['robots.txt', 'sitemap.xml', 'feed.xml']))
    expect(await readFile(path.join(outDir, 'robots.txt'), 'utf8')).toContain('OAI-SearchBot')
    await expect(readFile(path.join(outDir, 'llms.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('blocks error findings and reports warning findings through the injected reporter', async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'public-output-audit-'))
    roots.push(outDir)
    const config = createDefaultSiteConfiguration()
    const article = {
      relativePath: 'zh/skill/test.md', route: '/zh/skill/test', title: 'Test',
      description: 'Summary', body: '## Body', publishedAt: '', author: 'Jia him', sectionName: '技术'
    }

    await expect(generatePublicFiles(config, [article], outDir, { reportWarning: () => undefined }))
      .rejects.toThrow(/published-at-invalid/)

    config.geo.contentSignals.requirePublishedAt = false
    const warnings: string[] = []
    await generatePublicFiles(config, [article], outDir, { reportWarning: (message) => warnings.push(message) })
    expect(warnings.join('\n')).toContain('citation-missing')
  })
})
