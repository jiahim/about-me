import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS_PREVIEW_PREFERENCES, readSettingsPreviewPreferences, SETTINGS_PREVIEW_PREFERENCES_KEY, writeSettingsPreviewPreferences } from './preferences'

describe('settings preview preferences', () => {
  it('round-trips the supported controls', () => {
    writeSettingsPreviewPreferences(localStorage, {
      mode: 'page',
      viewport: 'tablet',
      zoom: 125,
      fullscreen: true
    })
    expect(readSettingsPreviewPreferences(localStorage)).toEqual({
      mode: 'page',
      viewport: 'tablet',
      zoom: 125,
      fullscreen: true
    })
    expect(localStorage.getItem(SETTINGS_PREVIEW_PREFERENCES_KEY)).toBeTruthy()
  })

  it('falls back atomically for invalid or unavailable storage values', () => {
    localStorage.setItem(SETTINGS_PREVIEW_PREFERENCES_KEY, JSON.stringify({ mode: 'tiny', zoom: 60 }))
    expect(readSettingsPreviewPreferences(localStorage)).toEqual(DEFAULT_SETTINGS_PREVIEW_PREFERENCES)
    localStorage.setItem(SETTINGS_PREVIEW_PREFERENCES_KEY, '{')
    expect(readSettingsPreviewPreferences(localStorage)).toEqual(DEFAULT_SETTINGS_PREVIEW_PREFERENCES)
  })
})
