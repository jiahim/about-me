import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { assertNoPreviewBridge } from './assert-no-preview-bridge'

describe('production preview leakage gate', () => {
  it('accepts clean output and rejects preview protocol markers', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'preview-leak-'))
    await mkdir(path.join(directory, 'assets'))
    await writeFile(path.join(directory, 'index.html'), '<main>site</main>')
    await expect(assertNoPreviewBridge(directory)).resolves.toEqual([])
    await writeFile(path.join(directory, 'assets/app.js'), 'const kind="settings-preview:update"')
    await expect(assertNoPreviewBridge(directory)).rejects.toThrow(/settings-preview:update/)
  })
})
