// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { applySiteAppearance } from './appearance'

afterEach(() => {
  document.documentElement.removeAttribute('data-content-layout')
  document.documentElement.style.removeProperty('--site-accent-color')
  localStorage.clear()
})

describe('site appearance runtime', () => {
  it('applies layout and accent and initializes the first-visit theme', () => {
    const isDark = { value: false }

    const cleanup = applySiteAppearance({
      settings: { defaultTheme: 'dark', accentColor: '#123456', contentLayout: 'wide' },
      document,
      storage: localStorage,
      isDark
    })

    expect(isDark.value).toBe(true)
    expect(document.documentElement.dataset.contentLayout).toBe('wide')
    expect(document.documentElement.style.getPropertyValue('--site-accent-color')).toBe('#123456')

    cleanup()
    expect(document.documentElement.hasAttribute('data-content-layout')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--site-accent-color')).toBe('')
  })

  it('does not override an existing VitePress visitor preference', () => {
    localStorage.setItem('vitepress-theme-appearance', 'light')
    const isDark = { value: false }

    applySiteAppearance({
      settings: { defaultTheme: 'dark', accentColor: '#123456', contentLayout: 'doc' },
      document,
      storage: localStorage,
      isDark
    })

    expect(isDark.value).toBe(false)
  })
})
