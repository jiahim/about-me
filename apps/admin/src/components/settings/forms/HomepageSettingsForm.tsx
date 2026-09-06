import type { SiteConfiguration } from '@jiahim/site-schema'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TextField, Toggle, type SettingsFieldChange } from './shared'

export function HomepageSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <div className="settings-list-grid col-span-full grid gap-4">{config.homepage.modules.map((module, index) => <Card key={module.id} className="gap-4"><CardHeader><CardTitle className="flex items-center justify-between"><span>{module.type === 'hero' ? '首页 Hero' : '首页功能卡片'}</span><code className="text-xs font-normal text-muted-foreground">{module.id} · order {module.order}</code></CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Toggle label="显示模块" checked={module.visible} onChange={(value) => onChange(['homepage', 'modules', index, 'visible'], value)} />
    {module.type === 'hero' && <>
      <TextField label="Hero 名称" value={module.name} onChange={(value) => onChange(['homepage', 'modules', index, 'name'], value)} />
      <TextField label="Hero 文本" value={module.text} onChange={(value) => onChange(['homepage', 'modules', index, 'text'], value)} />
      <TextField label="Hero 标语" value={module.tagline} onChange={(value) => onChange(['homepage', 'modules', index, 'tagline'], value)} />
      <TextField label="Hero 图片路径" value={module.image.src} onChange={(value) => onChange(['homepage', 'modules', index, 'image', 'src'], value)} />
      <TextField label="Hero 图片替代文本" value={module.image.alt} onChange={(value) => onChange(['homepage', 'modules', index, 'image', 'alt'], value)} />
      {module.actions.map((action, actionIndex) => <div key={`${module.id}-action-${actionIndex}`} className="grid gap-3 rounded-lg border p-3"><TextField label={`Hero 按钮 ${actionIndex + 1} 文案`} value={action.label} onChange={(value) => onChange(['homepage', 'modules', index, 'actions', actionIndex, 'label'], value)} /><TextField label={`Hero 按钮 ${actionIndex + 1} 链接`} value={action.href} onChange={(value) => onChange(['homepage', 'modules', index, 'actions', actionIndex, 'href'], value)} /><Toggle label="新窗口打开" checked={action.newTab} onChange={(value) => onChange(['homepage', 'modules', index, 'actions', actionIndex, 'newTab'], value)} /></div>)}
    </>}
    {module.type === 'features' && module.items.map((item, itemIndex) => <div key={item.id} className="grid gap-3 rounded-lg border p-3"><TextField label={`${item.title} 图标`} value={item.icon} onChange={(value) => onChange(['homepage', 'modules', index, 'items', itemIndex, 'icon'], value)} /><TextField label={`${item.title} 标题`} value={item.title} onChange={(value) => onChange(['homepage', 'modules', index, 'items', itemIndex, 'title'], value)} /><TextField label={`${item.title} 说明`} value={item.details} onChange={(value) => onChange(['homepage', 'modules', index, 'items', itemIndex, 'details'], value)} /><TextField label={`${item.title} 目标`} readOnly value={item.sectionId || item.href || ''} onChange={() => undefined} /></div>)}
  </CardContent></Card>)}</div>
}
