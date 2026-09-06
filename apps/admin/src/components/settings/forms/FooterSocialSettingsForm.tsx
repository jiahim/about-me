import type { SiteConfiguration } from '@jiahim/site-schema'

import { SettingsLinkList } from '../SettingsLinkList'
import { SettingsSocialLinkList } from '../SettingsSocialLinkList'
import { NumberField, TextField, type SettingsFieldChange } from './shared'

export function FooterSocialSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <>
    <TextField label="版权持有人" value={config.footer.copyright.holder} onChange={(value) => onChange(['footer', 'copyright', 'holder'], value)} />
    <TextField label="页脚说明" value={config.footer.notice} onChange={(value) => onChange(['footer', 'notice'], value)} />
    <NumberField label="版权起始年份" min={1970} value={config.footer.copyright.startYear} onChange={(value) => onChange(['footer', 'copyright', 'startYear'], value)} />
    <div className="col-span-full"><SettingsLinkList title="普通链接" itemLabel="普通链接" links={config.footer.links} onChange={(links) => onChange(['footer', 'links'], links)} /></div>
    <div className="col-span-full"><SettingsSocialLinkList links={config.footer.social} onChange={(links) => onChange(['footer', 'social'], links)} /></div>
  </>
}
