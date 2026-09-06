export const SETTINGS_PREVIEW_PREFERENCES_KEY = 'jiahim:settings-preview-preferences:v1'

export type SettingsPreviewMode = 'focus' | 'page'
export type SettingsPreviewViewport = 'responsive' | 'desktop' | 'tablet' | 'mobile'
export type SettingsPreviewZoom = 'fit' | 75 | 100 | 125

export interface SettingsPreviewPreferences {
  mode: SettingsPreviewMode
  viewport: SettingsPreviewViewport
  zoom: SettingsPreviewZoom
  fullscreen: boolean
}

export const DEFAULT_SETTINGS_PREVIEW_PREFERENCES: Readonly<SettingsPreviewPreferences> = {
  mode: 'focus',
  viewport: 'responsive',
  zoom: 'fit',
  fullscreen: false
}

function isSettingsPreviewPreferences(value: unknown): value is SettingsPreviewPreferences {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  const keys = Object.keys(candidate)

  return (
    keys.length === 4 &&
    (candidate.mode === 'focus' || candidate.mode === 'page') &&
    (candidate.viewport === 'responsive' ||
      candidate.viewport === 'desktop' ||
      candidate.viewport === 'tablet' ||
      candidate.viewport === 'mobile') &&
    (candidate.zoom === 'fit' ||
      candidate.zoom === 75 ||
      candidate.zoom === 100 ||
      candidate.zoom === 125) &&
    typeof candidate.fullscreen === 'boolean'
  )
}

export function readSettingsPreviewPreferences(storage: Pick<Storage, 'getItem'>): SettingsPreviewPreferences {
  try {
    const rawValue = storage.getItem(SETTINGS_PREVIEW_PREFERENCES_KEY)
    if (!rawValue) return { ...DEFAULT_SETTINGS_PREVIEW_PREFERENCES }

    const parsedValue: unknown = JSON.parse(rawValue)
    return isSettingsPreviewPreferences(parsedValue)
      ? parsedValue
      : { ...DEFAULT_SETTINGS_PREVIEW_PREFERENCES }
  } catch {
    return { ...DEFAULT_SETTINGS_PREVIEW_PREFERENCES }
  }
}

export function writeSettingsPreviewPreferences(
  storage: Pick<Storage, 'setItem'>,
  preferences: SettingsPreviewPreferences
): void {
  storage.setItem(SETTINGS_PREVIEW_PREFERENCES_KEY, JSON.stringify(preferences))
}
