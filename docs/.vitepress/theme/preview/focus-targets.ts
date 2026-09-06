import type { SettingsPreviewGroup } from '@jiahim/site-schema'

export type SettingsPreviewTarget = 'branding' | 'author' | 'sections' | 'navigation' | 'homepage' | 'appearance' | 'footer-social'

export const SETTINGS_PREVIEW_FOCUS_TARGETS: Readonly<Record<SettingsPreviewGroup, SettingsPreviewTarget | null>> = {
  basic: 'branding',
  branding: 'branding',
  author: 'author',
  sections: 'sections',
  navigation: 'navigation',
  homepage: 'homepage',
  appearance: 'appearance',
  'seo-geo': null,
  'footer-social': 'footer-social',
  integrations: null,
  advanced: null
}

export const SETTINGS_PREVIEW_TARGET_SELECTORS: Readonly<Record<SettingsPreviewTarget, string>> = {
  branding: '.VPNavBarTitle, .VPHero .image-container',
  author: '[data-settings-preview-target="author"], .article-meta, .VPHero',
  sections: '.VPFeatures',
  navigation: '.VPNavBarMenu',
  homepage: '.VPHome',
  appearance: '#app',
  'footer-social': '.VPFooter'
}
