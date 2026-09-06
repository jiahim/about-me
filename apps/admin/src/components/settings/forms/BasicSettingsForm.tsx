import type { SiteConfiguration } from '@jiahim/site-schema'

import { SelectField, TextField, type SettingsFieldChange } from './shared'

export function BasicSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <>
    <TextField label="站点名称" value={config.site.name} onChange={(value) => onChange(['site', 'name'], value)} />
    <TextField label="站点描述" value={config.site.description} onChange={(value) => onChange(['site', 'description'], value)} />
    <TextField label="Canonical URL" value={config.site.canonicalUrl} onChange={(value) => onChange(['site', 'canonicalUrl'], value)} />
    <SelectField label="默认语言" value={config.site.defaultLocale} options={Object.entries(config.locales).map(([value, locale]) => ({ value, label: locale.label }))} onChange={(value) => onChange(['site', 'defaultLocale'], value)} />
  </>
}
