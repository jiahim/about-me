import type { SiteConfiguration } from '@jiahim/site-schema'

export type SiteAppearanceSettings = SiteConfiguration['appearance']

interface MutableBoolean {
  value: boolean
}

interface ApplySiteAppearanceOptions {
  settings: SiteAppearanceSettings
  document: Document
  storage: Pick<Storage, 'getItem'>
  isDark: MutableBoolean
}

export function applySiteAppearance({
  settings,
  document,
  storage,
  isDark
}: ApplySiteAppearanceOptions): () => void {
  const root = document.documentElement
  const previousLayout = root.getAttribute('data-content-layout')
  const previousAccent = root.style.getPropertyValue('--site-accent-color')

  root.dataset.contentLayout = settings.contentLayout
  root.style.setProperty('--site-accent-color', settings.accentColor)

  let hasVisitorPreference = true
  try {
    hasVisitorPreference = storage.getItem('vitepress-theme-appearance') !== null
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  if (!hasVisitorPreference && settings.defaultTheme !== 'auto') {
    isDark.value = settings.defaultTheme === 'dark'
  }

  return () => {
    if (previousLayout === null) root.removeAttribute('data-content-layout')
    else root.setAttribute('data-content-layout', previousLayout)
    if (previousAccent) root.style.setProperty('--site-accent-color', previousAccent)
    else root.style.removeProperty('--site-accent-color')
  }
}
