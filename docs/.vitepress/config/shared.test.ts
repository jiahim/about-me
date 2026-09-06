import { describe, expect, it } from 'vitest'

import { createSharedConfig } from './shared'

describe('shared VitePress config', () => {
  it('preserves adapter Vite options while enforcing an empty output directory', () => {
    const config = createSharedConfig({
      vite: { define: { __KEEP_ADAPTER_OPTION__: 'true' } }
    })

    expect(config.vite).toMatchObject({
      define: { __KEEP_ADAPTER_OPTION__: 'true' },
      build: { emptyOutDir: true }
    })
  })

})
