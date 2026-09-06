import { createDefaultSiteConfiguration, CURRENT_SCHEMA_VERSION } from './defaults.js'
import {
  migrateSiteConfiguration,
  type MigrationWarning,
  type SiteConfigurationMigrationResult
} from './migrations.js'
import {
  siteConfigurationSchema,
  type NormalizedSiteConfiguration
} from './schema.js'
import { assertNoSecretFields, validateSiteConfiguration } from './validation.js'

export { createDefaultSiteConfiguration, CURRENT_SCHEMA_VERSION }
export { migrateSiteConfiguration }
export type { MigrationWarning, SiteConfigurationMigrationResult }
export {
  buildSectionForest,
  findSectionForArticlePath,
  listCreatableSections
} from './sections.js'
export type { SectionNode, SectionSurface } from './sections.js'
export {
  absoluteUrl,
  createBlogPostingJsonLd,
  createBreadcrumbJsonLd,
  createPersonJsonLd,
  createWebsiteJsonLd,
  escapeXml,
  generateAtomFeed,
  generateLlmsTxt,
  generateRobots,
  generateSitemap
} from './public-artifacts.js'
export type { JsonLd, PublicArticleRecord } from './public-artifacts.js'
export { auditArticleContentSignals } from './content-signals.js'
export type {
  CheckableArticle,
  ContentSignalContext,
  ContentSignalFinding,
  ContentSignalPolicy
} from './content-signals.js'
export { evaluateEnvironmentReadiness } from './readiness.js'
export type {
  EnvironmentReadiness,
  EnvironmentRequirementOwner
} from './readiness.js'
export {
  findFieldConsumer,
  SITE_CONFIGURATION_FIELD_CONSUMERS
} from './field-consumers.js'
export {
  createSettingsPreviewModel,
  parseSettingsPreviewMessage,
  SETTINGS_PREVIEW_PROTOCOL_VERSION,
  settingsPreviewGroupSchema,
  settingsPreviewMessageSchema,
  settingsPreviewModelSchema
} from './preview.js'
export type {
  SettingsPreviewGroup,
  SettingsPreviewMessage,
  SettingsPreviewModel,
  SettingsPreviewNavigateMessage,
  SettingsPreviewProtocolMessage,
  SettingsPreviewReadyMessage
} from './preview.js'
export type {
  FieldConsumptionKind,
  FieldPreviewKind,
  SiteConfigurationFieldConsumer
} from './field-consumers.js'
export type {
  DeepReadonly,
  NormalizedSiteConfiguration,
  PublicImage,
  PublicLink,
  SocialLink,
  SectionConfiguration,
  SiteConfiguration
} from './schema.js'

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)
  for (const nested of Object.values(value)) deepFreeze(nested)
  return value
}

export function parseSiteConfiguration(
  input: unknown
): NormalizedSiteConfiguration {
  return parseSiteConfigurationWithReport(input).config
}

export function parseSiteConfigurationWithReport(input: unknown): {
  config: NormalizedSiteConfiguration
  sourceVersion: 1 | 2
  warnings: readonly MigrationWarning[]
} {
  const migrated = migrateSiteConfiguration(input)
  assertNoSecretFields(migrated.config)
  const parsed = siteConfigurationSchema.parse(migrated.config)
  validateSiteConfiguration(parsed)
  return {
    config: deepFreeze(parsed),
    sourceVersion: migrated.sourceVersion,
    warnings: Object.freeze(migrated.warnings.slice())
  }
}
