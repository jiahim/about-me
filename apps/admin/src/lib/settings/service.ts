import { SettingsRepository } from './repository'
import { findRepositoryRoot } from '../repository-root'
import { SectionTransaction } from './section-transaction'
import { SettingsSessionStore } from './session'

const settingsServiceState = globalThis as typeof globalThis & { __jiahimSettingsSessionStore?: SettingsSessionStore }

export function getSettingsRepository(): SettingsRepository {
  return new SettingsRepository()
}

export function getSectionTransaction(): SectionTransaction {
  const root = findRepositoryRoot()
  return new SectionTransaction(root, new SettingsRepository(root))
}

export function getSettingsSessionStore(): SettingsSessionStore {
  settingsServiceState.__jiahimSettingsSessionStore ??= new SettingsSessionStore()
  return settingsServiceState.__jiahimSettingsSessionStore
}
