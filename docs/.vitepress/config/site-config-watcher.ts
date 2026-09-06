import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

export function createSiteConfigWatcher(configurationPath: string, debounceMs = 120): Plugin {
  const absoluteConfigurationPath = path.resolve(configurationPath)
  return {
    name: 'jiahim-site-config-watcher',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      let restartTimer: ReturnType<typeof setTimeout> | undefined
      server.watcher.add(absoluteConfigurationPath)
      server.watcher.on('change', (changedPath) => {
        if (path.resolve(changedPath) !== absoluteConfigurationPath) return
        if (restartTimer) clearTimeout(restartTimer)
        restartTimer = setTimeout(() => {
          restartTimer = undefined
          void server.restart()
        }, debounceMs)
      })
    }
  }
}
