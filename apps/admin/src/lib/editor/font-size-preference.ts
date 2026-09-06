export type FontSizePreference = 'small' | 'medium' | 'large'

const FONT_SIZE_PREFERENCES: readonly FontSizePreference[] = [
  'small',
  'medium',
  'large'
]

export function readFontSizePreference(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  fallback: FontSizePreference
): FontSizePreference {
  const value = storage.getItem(key)
  return FONT_SIZE_PREFERENCES.includes(value as FontSizePreference)
    ? value as FontSizePreference
    : fallback
}

export function writeFontSizePreference(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  value: FontSizePreference
): void {
  storage.setItem(key, value)
}

export function stepFontSizePreference(
  current: FontSizePreference,
  direction: -1 | 1
): FontSizePreference {
  const index = FONT_SIZE_PREFERENCES.indexOf(current)
  const nextIndex = Math.min(
    FONT_SIZE_PREFERENCES.length - 1,
    Math.max(0, index + direction)
  )
  return FONT_SIZE_PREFERENCES[nextIndex]
}
