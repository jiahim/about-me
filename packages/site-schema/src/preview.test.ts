import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from './defaults.js'
import {
  createSettingsPreviewModel,
  parseSettingsPreviewMessage,
  SETTINGS_PREVIEW_PROTOCOL_VERSION
} from './preview.js'

describe('settings preview protocol', () => {
  it('projects only public render data and explicit artifacts', () => {
    const config = createDefaultSiteConfiguration() as ReturnType<typeof createDefaultSiteConfiguration> & { privateDraft?: unknown }
    config.privateDraft = { websiteIdValue: 'secret-from-environment' }
    const model = createSettingsPreviewModel(config, 'footer-social', [
      { name: 'COMMENTS_TOKEN', exists: false, requiredBy: ['comments'] }
    ])
    const serialized = JSON.stringify(model)

    expect(model).toMatchObject({
      version: SETTINGS_PREVIEW_PROTOCOL_VERSION,
      group: 'footer-social',
      footer: { notice: config.footer.notice },
      readiness: { comments: false }
    })
    expect(model.artifacts.robots).toContain('User-agent:')
    expect(model.artifacts.personJsonLd).toContain('Person')
    expect(serialized).not.toContain('contentRoot')
    expect(serialized).not.toContain('docs/zh')
    expect(serialized).not.toContain('requiredEnvironmentVariables')
    expect(serialized).not.toContain('websiteIdValue')
    expect(serialized).not.toContain('secret-from-environment')
  })

  it('projects visible navigation to renderable hrefs without repository fields', () => {
    const config = createDefaultSiteConfiguration()
    const model = createSettingsPreviewModel(config, 'navigation', [])

    expect(model.navigation[0]).toEqual({
      id: 'nav-book',
      label: '读书',
      href: '/zh/book/',
      newTab: false,
      locale: 'zh-CN'
    })
    expect(model.sections[0]).not.toHaveProperty('directory')
  })

  it('strictly parses update, ready, and navigation messages', () => {
    const model = createSettingsPreviewModel(createDefaultSiteConfiguration(), 'branding', [])
    expect(parseSettingsPreviewMessage({
      kind: 'settings-preview:update',
      version: 1,
      sessionId: 'session-1',
      model
    })).toMatchObject({ kind: 'settings-preview:update' })
    expect(parseSettingsPreviewMessage({ kind: 'settings-preview:ready', version: 1, sessionId: 'session-1' })).toMatchObject({ kind: 'settings-preview:ready' })
    expect(parseSettingsPreviewMessage({ kind: 'settings-preview:navigate', version: 1, sessionId: 'session-1', href: '/zh/book/' })).toMatchObject({ kind: 'settings-preview:navigate' })
    expect(() => parseSettingsPreviewMessage({ kind: 'settings-preview:update', version: 2 })).toThrow()
    expect(() => parseSettingsPreviewMessage({ kind: 'settings-preview:ready', version: 1, sessionId: 'session-1', extra: true })).toThrow()
  })
})
