import { describe, expect, it, vi } from 'vitest'

import { createSiteConfigWatcher } from './site-config-watcher'

describe('site config watcher', () => {
  it('debounces only the external site configuration file', async () => {
    vi.useFakeTimers()
    const restart = vi.fn()
    let change: ((file: string) => void) | undefined
    const plugin = createSiteConfigWatcher('/repo/config/site.config.json', 50)
    plugin.configureServer?.({
      watcher: { add: vi.fn(), on: (_event: string, handler: (file: string) => void) => { change = handler } },
      restart
    } as never)

    change?.('/repo/docs/a.md')
    change?.('/repo/config/site.config.json')
    change?.('/repo/config/site.config.json')
    await vi.advanceTimersByTimeAsync(50)
    expect(restart).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
