import type { SiteConfiguration } from '@jiahim/site-schema'

import { NumberField, SelectField, TextField, type SettingsFieldChange } from './shared'

export function AppearanceSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <>
    <TextField label="强调色" value={config.appearance.accentColor} onChange={(value) => onChange(['appearance', 'accentColor'], value)} />
    <SelectField label="默认主题" value={config.appearance.defaultTheme} options={[{ value: 'auto', label: '跟随系统' }, { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }]} onChange={(value) => onChange(['appearance', 'defaultTheme'], value)} />
    <TextField label="大纲标题" value={config.appearance.outline.label} onChange={(value) => onChange(['appearance', 'outline', 'label'], value)} />
    <SelectField label="内容宽度" value={config.appearance.contentLayout} options={[{ value: 'doc', label: '文档' }, { value: 'wide', label: '宽屏' }]} onChange={(value) => onChange(['appearance', 'contentLayout'], value)} />
    <SelectField label="浅色代码主题" value={config.appearance.codeTheme.light} options={['github-light', 'vitesse-light', 'min-light'].map((value) => ({ value, label: value }))} onChange={(value) => onChange(['appearance', 'codeTheme', 'light'], value)} />
    <SelectField label="深色代码主题" value={config.appearance.codeTheme.dark} options={['github-dark', 'vitesse-dark', 'min-dark', 'nord', 'one-dark-pro'].map((value) => ({ value, label: value }))} onChange={(value) => onChange(['appearance', 'codeTheme', 'dark'], value)} />
    <NumberField label="大纲起始级别" min={1} max={6} value={config.appearance.outline.minLevel} onChange={(value) => onChange(['appearance', 'outline', 'minLevel'], value)} />
    <NumberField label="大纲结束级别" min={1} max={6} value={config.appearance.outline.maxLevel} onChange={(value) => onChange(['appearance', 'outline', 'maxLevel'], value)} />
  </>
}
