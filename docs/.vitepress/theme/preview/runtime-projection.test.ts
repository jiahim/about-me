// @vitest-environment jsdom

import { createDefaultSiteConfiguration, createSettingsPreviewModel } from '@jiahim/site-schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applySettingsPreviewModel } from './runtime-projection'

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-content-layout')
  document.documentElement.style.removeProperty('--site-accent-color')
})

describe('settings preview runtime projection', () => {
  it('marks, focuses, scrolls to, and cleans the real footer target', () => {
    document.body.innerHTML = '<footer class="VPFooter"><p class="message">old</p><p class="copyright">old</p></footer>'
    const footer = document.querySelector<HTMLElement>('.VPFooter')!
    footer.scrollIntoView = vi.fn()
    const model = createSettingsPreviewModel(createDefaultSiteConfiguration(), 'footer-social', [])

    const cleanup = applySettingsPreviewModel(document, model)

    expect(footer.getAttribute('data-settings-preview-target')).toBe('footer-social')
    expect(footer.classList.contains('settings-preview-focus')).toBe(true)
    expect(footer.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })

    cleanup()
    expect(footer.hasAttribute('data-settings-preview-target')).toBe(false)
    expect(footer.classList.contains('settings-preview-focus')).toBe(false)
  })
})
