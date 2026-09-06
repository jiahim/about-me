import type { SiteConfiguration } from '@jiahim/site-schema'

import { Button } from '@/components/ui/button'

import type { SettingsGroupId } from './SettingsSidebar'
import { NavigationManager } from './settings/NavigationManager'
import { SectionManager } from './settings/SectionManager'
import { SettingsSectionCard } from './settings/SettingsSectionCard'
import { AdvancedSettingsForm } from './settings/forms/AdvancedSettingsForm'
import { AppearanceSettingsForm } from './settings/forms/AppearanceSettingsForm'
import { AuthorSettingsForm } from './settings/forms/AuthorSettingsForm'
import { BasicSettingsForm } from './settings/forms/BasicSettingsForm'
import { BrandSettingsForm } from './settings/forms/BrandSettingsForm'
import { FooterSocialSettingsForm } from './settings/forms/FooterSocialSettingsForm'
import { HomepageSettingsForm } from './settings/forms/HomepageSettingsForm'
import { IntegrationsSettingsForm } from './settings/forms/IntegrationsSettingsForm'
import { SeoGeoSettingsForm } from './settings/forms/SeoGeoSettingsForm'
import type { SettingsFieldChange } from './settings/forms/shared'

interface SettingsFormHostProps {
  baseHash?: string
  busy: boolean
  config: SiteConfiguration
  group: SettingsGroupId
  environmentRequirements: readonly { name: string; exists: boolean }[]
  normalizedJson: string
  saveDisabled: boolean
  sectionOperationsDisabled?: boolean
  onChange: SettingsFieldChange
  onSave: () => void
  onSectionApplied?: (result: { config: SiteConfiguration; baseHash: string; changedPaths: string[]; articleCount?: number; session?: { id: string; expiresAt: number; publishablePaths: readonly string[]; rejectedPaths: readonly { path: string; reason: string }[]; blockReason?: string } }) => void
}

const groupTitles: Record<SettingsGroupId, string> = {
  basic: '基础',
  branding: '品牌',
  author: '作者',
  sections: '栏目',
  navigation: '导航',
  homepage: '首页',
  appearance: '外观',
  'seo-geo': 'SEO / GEO',
  'footer-social': '页脚与社交',
  integrations: '公开集成',
  advanced: '高级'
}

export function SettingsFormHost({ baseHash, busy, config, environmentRequirements, group, normalizedJson, onChange, onSave, onSectionApplied, saveDisabled, sectionOperationsDisabled = false }: SettingsFormHostProps) {
  return (
    <section className="settings-form-pane" aria-label="设置表单" aria-busy={busy}>
      <div className="settings-form-pane__toolbar">
        <div><h1>{groupTitles[group]}</h1><p>修改先保存到本地工作区；保存后可在顶部“发布设置”进入 Git 审查与远端发布流程。</p></div>
        <Button disabled={saveDisabled} type="button" onClick={onSave}>保存设置</Button>
      </div>
      <fieldset className={`settings-form-grid${group === 'advanced' ? ' settings-form-grid--advanced' : ''}`} disabled={busy}>
        {group === 'basic' && <BasicSettingsForm config={config} onChange={onChange} />}
        {group === 'branding' && <BrandSettingsForm config={config} onChange={onChange} />}
        {group === 'author' && <AuthorSettingsForm config={config} onChange={onChange} />}
        {group === 'sections' && (baseHash && onSectionApplied
          ? <SectionManager baseHash={baseHash} config={config} disabled={sectionOperationsDisabled} onApplied={onSectionApplied} onChange={onChange} />
          : <div className="settings-list-grid col-span-full"><p className="settings-note">栏目目录、公开路由、层级和排序由事务向导维护；这里可以修改展示名称、描述和导航可见性。</p>{config.sections.map((section, index) => <SettingsSectionCard key={section.id} index={index} section={section} onChange={onChange} />)}</div>)}
        {group === 'navigation' && <div className="col-span-full"><NavigationManager config={config} onChange={onChange} /></div>}
        {group === 'homepage' && <HomepageSettingsForm config={config} onChange={onChange} />}
        {group === 'appearance' && <AppearanceSettingsForm config={config} onChange={onChange} />}
        {group === 'seo-geo' && <SeoGeoSettingsForm config={config} onChange={onChange} />}
        {group === 'footer-social' && <FooterSocialSettingsForm config={config} onChange={onChange} />}
        {group === 'integrations' && <IntegrationsSettingsForm config={config} onChange={onChange} />}
        {group === 'advanced' && <AdvancedSettingsForm config={config} environmentRequirements={environmentRequirements} normalizedJson={normalizedJson} onChange={onChange} />}
      </fieldset>
    </section>
  )
}

export type { SettingsFieldChange }
