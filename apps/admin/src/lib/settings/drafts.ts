import {
  parseSiteConfiguration,
  parseSiteConfigurationWithReport,
  type NormalizedSiteConfiguration,
  type SiteConfiguration
} from '@jiahim/site-schema'

export const settingsDraftKey = 'jiahim:site-settings-draft:v2'
export const legacySettingsDraftKey = 'jiahim:site-settings-draft:v1'

export interface StoredSettingsDraft {
  config: SiteConfiguration | NormalizedSiteConfiguration
  baseHash: string
  savedAt: number
}

export type SettingsDraftReadResult =
  | { status: 'none' }
  | { status: 'restored' | 'conflict'; draft: StoredSettingsDraft }

export function writeSettingsDraft(
  storage: Storage,
  draft: StoredSettingsDraft
): void {
  const config = parseSiteConfiguration(draft.config)
  storage.setItem(
    settingsDraftKey,
    JSON.stringify({ version: 2, ...draft, config })
  )
}

export function clearSettingsDraft(storage: Storage): void {
  storage.removeItem(settingsDraftKey)
  storage.removeItem(legacySettingsDraftKey)
}

function parseStoredDraft(raw: string, expectedVersion: 1 | 2): StoredSettingsDraft | undefined {
  const value = JSON.parse(raw) as Record<string, unknown>
  if (
    value.version !== expectedVersion ||
    typeof value.baseHash !== 'string' ||
    typeof value.savedAt !== 'number'
  ) {
    return undefined
  }
  return {
    config: parseSiteConfigurationWithReport(value.config).config,
    baseHash: value.baseHash,
    savedAt: value.savedAt
  }
}

function resultForDraft(
  draft: StoredSettingsDraft,
  persistedHash: string
): SettingsDraftReadResult {
  return {
    status: draft.baseHash === persistedHash ? 'restored' : 'conflict',
    draft
  }
}

export function readSettingsDraft(
  storage: Storage,
  persistedHash: string
): SettingsDraftReadResult {
  const currentRaw = storage.getItem(settingsDraftKey)
  if (currentRaw) {
    try {
      const draft = parseStoredDraft(currentRaw, 2)
      return draft ? resultForDraft(draft, persistedHash) : { status: 'none' }
    } catch {
      return { status: 'none' }
    }
  }

  const legacyRaw = storage.getItem(legacySettingsDraftKey)
  if (!legacyRaw) return { status: 'none' }
  try {
    const draft = parseStoredDraft(legacyRaw, 1)
    if (!draft) return { status: 'none' }
    writeSettingsDraft(storage, draft)
    storage.removeItem(legacySettingsDraftKey)
    return resultForDraft(draft, persistedHash)
  } catch {
    return { status: 'none' }
  }
}
