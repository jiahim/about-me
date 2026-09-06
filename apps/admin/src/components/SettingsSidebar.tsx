import { Button } from '@/components/ui/button'

export const settingsGroups = [
  ['basic', '基础'],
  ['branding', '品牌'],
  ['author', '作者'],
  ['sections', '栏目'],
  ['navigation', '导航'],
  ['homepage', '首页'],
  ['appearance', '外观'],
  ['seo-geo', 'SEO / GEO'],
  ['footer-social', '页脚与社交'],
  ['integrations', '公开集成'],
  ['advanced', '高级']
] as const

export type SettingsGroupId = (typeof settingsGroups)[number][0]

interface SettingsSidebarProps {
  activeGroup: SettingsGroupId
  onChange: (group: SettingsGroupId) => void
}

export function SettingsSidebar({ activeGroup, onChange }: SettingsSidebarProps) {
  return (
    <nav className="settings-sidebar" aria-label="设置分组">
      <div className="pane-heading">
        <span>站点设置</span>
        <small>公开配置</small>
      </div>
      {settingsGroups.map(([id, label]) => (
        <Button
          aria-current={activeGroup === id ? 'page' : undefined}
          className="settings-sidebar__item"
          key={id}
          type="button"
          variant={activeGroup === id ? 'secondary' : 'ghost'}
          onClick={() => onChange(id)}
        >
          {label}
        </Button>
      ))}
    </nav>
  )
}
